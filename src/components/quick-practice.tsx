"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { QuickPracticeView } from "@/lib/quick-practice";
import { quickPracticeActive } from "@/lib/quick-practice";
import { Glyph, LoaderCircle, RefreshCw, ArrowRight } from "./icons";
import { Modal } from "./ui";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/documents${path}`, {
    cache: "no-store",
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(data?.error || "Chưa kết nối được máy chủ. Hãy thử lại.");
  return data;
}

export function useQuickPractice(documentId: string) {
  const [sets, setSets] = useState<QuickPracticeView[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const sending = useRef(false);
  useEffect(() => {
    setSets([]);
  }, [documentId]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await request<{ sets: QuickPracticeView[] }>(
          `/${documentId}/quick-practice`,
        );
        if (!active) return;
        setSets(data.sets);
        setError("");
        if (data.sets.some((s) => quickPracticeActive(s.status)))
          timer = setTimeout(poll, 3000);
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          timer = setTimeout(poll, 5000);
        }
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [documentId, refresh]);
  async function send(
    body: { requestId: string; count: number } | { retryId: string },
  ) {
    if (sending.current) return false;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const set =
        "retryId" in body
          ? await request<QuickPracticeView>(
              `/${documentId}/quick-practice/${body.retryId}/retry`,
              {},
            )
          : await request<QuickPracticeView>(
              `/${documentId}/quick-practice`,
              body,
            );
      setSets((prev) => [set, ...prev.filter((s) => s.id !== set.id)]);
      setRefresh((v) => v + 1);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return { sets, error, busy, send };
}

export function QuickPracticeProgress({
  sets,
  busy,
  retry,
}: {
  sets: QuickPracticeView[];
  busy: boolean;
  retry: (id: string) => void;
}) {
  if (!sets.length) return null;
  return (
    <section
      className="quick-practice-progress"
      aria-label="Tiến trình đề luyện"
    >
      {sets.map((set) => {
        const active = quickPracticeActive(set.status);
        const failed = ["partial", "failed", "waiting_config"].includes(
          set.status,
        );
        return (
          <div className="document-status-inline" key={set.id} role="status">
            <strong>
              {active ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Glyph token="practice" size={16} />
              )}{" "}
              Đề luyện · {set.count} câu
            </strong>
            <span>
              {set.status === "ready"
                ? "Đã tạo và kiểm tra xong đề luyện."
                : set.message}
            </span>
            {set.status !== "waiting_source" && (
              <span>
                {set.createdCount}/{set.count} câu đã kiểm tra
              </span>
            )}
            {active &&
              (set.status === "waiting_source" ? (
                <progress aria-label="Đang chờ nhận diện nguồn để tạo đề luyện" />
              ) : (
                <progress
                  max={set.count}
                  value={set.createdCount}
                  aria-label="Số câu luyện đã tạo và kiểm tra"
                />
              ))}
            {set.status === "ready" && (
              <Link className="text-button" href={`/luyen-tap/bo/${set.id}`}>
                Vào làm đề luyện <ArrowRight size={16} />
              </Link>
            )}
            {failed && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => retry(set.id)}
              >
                <RefreshCw size={16} /> Thử lại phần chưa xong
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function QuickPracticeDialog({
  busy,
  error,
  onClose,
  onCreate,
}: {
  busy: boolean;
  error: string;
  onClose: () => void;
  onCreate: (body: { requestId: string; count: number }) => Promise<boolean>;
}) {
  const [count, setCount] = useState("25");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const value = Number(count);
  const valid = Number.isInteger(value) && value >= 5 && value <= 50;
  return (
    <Modal title="Tạo đề luyện" onClose={onClose}>
      <form
        className="quick-practice-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (valid && !busy && (await onCreate({ requestId, count: value })))
            onClose();
        }}
      >
        <p>
          Tạo đề luyện mới từ tài liệu này. Nếu tài liệu đang nhận diện, đề
          luyện sẽ tự bắt đầu khi đọc đủ nguồn, không cần chờ giải xong đề gốc.
        </p>
        <label>
          Số câu hỏi
          <input
            type="number"
            min={5}
            max={50}
            step={1}
            required
            value={count}
            disabled={busy}
            aria-describedby="quick-practice-count-help"
            onChange={(e) => {
              setCount(e.target.value);
              setRequestId(crypto.randomUUID());
            }}
          />
        </label>
        <p className="micro" id="quick-practice-count-help">
          Chọn từ 5 đến 50 câu. Mặc định 25 câu.
        </p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="button" type="submit" disabled={busy || !valid}>
            {busy ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <Glyph token="practice" size={18} />
            )}{" "}
            {busy ? "Đang gửi yêu cầu…" : "Tạo đề luyện"}
          </button>
          <button className="button secondary" type="button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </form>
    </Modal>
  );
}
