"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  Layers3,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { subjects, type Subject, type PublicDocument } from "@/lib/documents";
import type { RevisionCatalog, RevisionKind } from "@/lib/revision";
import type { LearningView, RunView } from "@/lib/learning";
import { ButtonLink, PageTitle } from "./ui";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/documents${path}`, {
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(data?.error || "Chưa kết nối được máy chủ. Hãy thử lại.");
  return data;
}
const searchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/giu, "d")
    .toLocaleLowerCase("vi");
const setStatus: Record<string, string> = {
  queued: "Đang chờ",
  generating: "Đang tạo",
  ready: "Sẵn sàng làm bài",
  partial: "Cần thử lại một phần",
  failed: "Cần thử lại",
  waiting_config: "Chờ kết nối AI",
};

export function RevisionPage({ kind }: { kind: RevisionKind }) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<RevisionCatalog | null>(null);
  const [subject, setSubject] = useState<Subject>("math");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [countInput, setCountInput] = useState("25");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const byTopics = kind === "topics";
  useEffect(() => {
    let active = true;
    setError("");
    request<RevisionCatalog>("/revision")
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  const documents =
    catalog?.documents.filter((d) => d.subject === subject) || [];
  const topics = [...new Set(documents.flatMap((d) => d.topics))].sort((a, b) =>
    a.localeCompare(b, "vi"),
  );
  const options = byTopics
    ? topics.map((topic) => ({
        id: topic,
        title: topic,
        detail: `${documents.filter((d) => d.topics.includes(topic)).length} tài liệu nguồn`,
      }))
    : documents.map((d) => ({
        id: d.id,
        title: d.title,
        detail: `${d.pageCount} trang đã đọc rõ · ${d.topics.length} đề tài${d.partial ? " · Nhận diện một phần" : ""}`,
      }));
  const filtered = options.filter((o) =>
    searchText(o.title).includes(searchText(search)),
  );
  const count = Number(countInput);
  const validCount = Number.isInteger(count) && count >= 5 && count <= 50;
  function toggle(id: string) {
    if (selected.includes(id)) setSelected(selected.filter((s) => s !== id));
    else if (selected.length >= (byTopics ? 50 : 20))
      setError(
        `Mỗi bộ chọn tối đa ${byTopics ? 50 : 20} ${byTopics ? "đề tài" : "tài liệu"}.`,
      );
    else {
      setSelected([...selected, id]);
      setError("");
    }
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      const created = await request<{ id: string }>("/revision", {
        kind,
        subject,
        count,
        documentIds: byTopics ? [] : selected,
        topics: byTopics ? selected : [],
      });
      router.push(`/luyen-tap/bo/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="LUYỆN TẬP · TỪ TÀI LIỆU CỦA EM"
        title={byTopics ? "Ôn tổng hợp" : "Ôn bài"}
      >
        {byTopics
          ? "Chọn đề tài em muốn ôn. Mỗi câu hỏi đều dựa trên tài liệu đã nhận diện trong thư viện."
          : "Gom những tài liệu đã học, tạo một bộ câu hỏi mới để ôn lại cùng nhau."}
      </PageTitle>
      <div className="revision-tabs" aria-label="Cách ôn tập">
        <Link
          href="/luyen-tap/on-bai"
          aria-current={!byTopics ? "page" : undefined}
        >
          <BookOpen size={18} /> Ôn bài
        </Link>
        <Link
          href="/luyen-tap/on-tong-hop"
          aria-current={byTopics ? "page" : undefined}
        >
          <Layers3 size={18} /> Ôn tổng hợp
        </Link>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}{" "}
          {!catalog && (
            <button
              className="text-button"
              onClick={() => setRefresh(refresh + 1)}
            >
              Tải lại
            </button>
          )}
        </div>
      )}
      {!catalog ? (
        <p role="status">{error ? "" : "Đang mở thư viện…"}</p>
      ) : (
        <form
          className="revision-layout"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <section className="card revision-picker">
            <label className="field">
              Môn học
              <select
                value={subject}
                disabled={busy}
                onChange={(e) => {
                  setSubject(e.target.value as Subject);
                  setSelected([]);
                  setSearch("");
                  setError("");
                }}
              >
                {Object.entries(subjects).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="micro">
              Mỗi bộ luyện tập dành cho một môn. Đổi môn sẽ bỏ lựa chọn hiện
              tại.
            </p>
            <h2>
              {byTopics ? "Em muốn ôn đề tài nào?" : "Chọn tài liệu để ôn"}
            </h2>
            <label className="revision-search">
              <Search size={18} />
              <span className="sr-only">
                {byTopics ? "Tìm đề tài" : "Tìm tài liệu"}
              </span>
              <input
                type="search"
                placeholder={
                  byTopics
                    ? "Tìm đề tài, ví dụ: cộng có nhớ…"
                    : "Tìm tên tài liệu…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={busy}
              />
            </label>
            {selected.length > 0 && (
              <div className="revision-selected" aria-label="Đã chọn">
                {selected.map((id) => (
                  <button
                    className="revision-chip"
                    type="button"
                    key={id}
                    disabled={busy}
                    onClick={() => toggle(id)}
                    aria-label={`Bỏ chọn ${options.find((o) => o.id === id)?.title || id}`}
                  >
                    {options.find((o) => o.id === id)?.title || id}
                    <X size={14} />
                  </button>
                ))}
              </div>
            )}
            {!options.length ? (
              <div className="empty-state">
                <FileText size={36} />
                <h3>Chưa có nội dung để ôn môn này</h3>
                <p>
                  Upload và nhận diện tài liệu trước nhé. Những trang cần kiểm
                  tra sẽ chưa dùng để tạo câu hỏi.
                </p>
                <ButtonLink href={`/tai-len/${subject}`}>
                  Gửi tài liệu <ArrowRight size={17} />
                </ButtonLink>
              </div>
            ) : (
              <>
                <p className="micro" role="status">
                  {filtered.length} {byTopics ? "đề tài" : "tài liệu"} · Đã chọn{" "}
                  {selected.length}
                </p>
                <div className="revision-options">
                  {filtered.slice(0, 40).map((option) => (
                    <label
                      key={option.id}
                      className={`revision-option ${selected.includes(option.id) ? "chosen" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(option.id)}
                        onChange={() => toggle(option.id)}
                        disabled={busy}
                      />
                      <span>
                        <strong>{option.title}</strong>
                        <small>{option.detail}</small>
                      </span>
                      {selected.includes(option.id) && <Check size={18} />}
                    </label>
                  ))}
                  {!filtered.length && (
                    <p>Chưa tìm thấy. Em thử từ khóa khác nhé.</p>
                  )}
                </div>
                {filtered.length > 40 && (
                  <p className="micro">
                    Đang hiện 40 kết quả đầu. Nhập tên để tìm nhanh nội dung còn
                    lại.
                  </p>
                )}
              </>
            )}
          </section>
          <aside className="card revision-summary">
            <span className="eyebrow">BỘ LUYỆN CỦA EM</span>
            <h2>{subjects[subject].name}</h2>
            <p>
              {selected.length} {byTopics ? "đề tài" : "tài liệu"} đã chọn
            </p>
            <label className="field">
              Số câu hỏi
              <input
                type="number"
                min={5}
                max={50}
                step={1}
                required
                value={countInput}
                disabled={busy}
                onChange={(e) => setCountInput(e.target.value)}
              />
            </label>
            <p className="micro">Mặc định 25 câu · Tùy chọn 5–50 câu.</p>
            {selected.length > count && (
              <p className="notice">
                Chọn số câu ít nhất bằng số {byTopics ? "đề tài" : "tài liệu"}{" "}
                để ôn đủ từng {byTopics ? "đề tài" : "tài liệu"} nhé.
              </p>
            )}
            <div className="revision-benefits">
              <p>✓ Câu hỏi mới bám tài liệu nguồn</p>
              <p>✓ Có gợi ý, đáp án và giải thích</p>
              <p>✓ Tiến độ và kết quả lưu vào Hành trình</p>
            </div>
            <button
              type="submit"
              className="button full"
              disabled={
                busy ||
                !selected.length ||
                !validCount ||
                selected.length > count
              }
            >
              {busy ? (
                <>
                  <LoaderCircle size={18} className="spin" /> Đang chuẩn bị…
                </>
              ) : (
                <>
                  Tạo bộ luyện tập <ArrowRight size={18} />
                </>
              )}
            </button>
          </aside>
        </form>
      )}
      {!!catalog?.sets.filter((s) => s.kind === kind).length && (
        <section className="section">
          <h2>Bộ ôn đã tạo</h2>
          <div className="document-grid">
            {catalog.sets
              .filter((s) => s.kind === kind)
              .slice(0, 12)
              .map((s) => (
                <Link
                  className="card document-card"
                  href={`/luyen-tap/bo/${s.id}`}
                  key={s.id}
                >
                  <span className="badge">
                    {setStatus[s.status] || s.status}
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.count} câu</p>
                  <small>{new Date(s.createdAt).toLocaleString("vi-VN")}</small>
                </Link>
              ))}
          </div>
        </section>
      )}
    </>
  );
}

export function RevisionSetPage({ id }: { id: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<PublicDocument | null>(null);
  const [view, setView] = useState<LearningView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const [d, v] = await Promise.all([
          request<PublicDocument>(`/${id}`),
          request<LearningView>(`/${id}/learning`),
        ]);
        if (!active) return;
        if (!d.revision) throw new Error("Không tìm thấy bộ ôn tập.");
        setDoc(d);
        setView(v);
        setError("");
        if (v.pack && ["queued", "generating"].includes(v.pack.status))
          timer = setTimeout(load, 3000);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, refresh]);
  const pack = view?.pack;
  const working = pack && ["queued", "generating"].includes(pack.status);
  const back =
    doc?.revision?.kind === "topics"
      ? "/luyen-tap/on-tong-hop"
      : "/luyen-tap/on-bai";
  async function start() {
    setBusy(true);
    setError("");
    try {
      const run = await request<RunView>(`/${id}/runs`, { kind: "practice" });
      router.push(`/luyen-tap/${id}/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function retry() {
    if (!pack) return;
    setBusy(true);
    setError("");
    try {
      setView(
        await request<LearningView>(`/${id}/generate`, {
          count: pack.count,
          topics: pack.topics,
          retry: true,
        }),
      );
      setRefresh(refresh + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href={back} className="back-link">
        <ArrowLeft size={16} /> Chọn bộ ôn khác
      </Link>
      {error && (
        <div className="notice error" role="alert">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => setRefresh(refresh + 1)}
          >
            Tải lại trạng thái
          </button>
        </div>
      )}
      {!doc || !pack ? (
        <p role="status">{error ? "" : "Đang mở bộ luyện tập…"}</p>
      ) : (
        <>
          <PageTitle eyebrow="LUYỆN TẬP · TỪ TÀI LIỆU CỦA EM" title={doc.title}>
            {pack.count} câu · {pack.topics.length} đề tài ·{" "}
            {doc.revision?.documentIds.length} tài liệu nguồn
          </PageTitle>
          <section className="card revision-progress" aria-live="polite">
            <span className="badge">{setStatus[pack.status]}</span>
            <h2>
              {working
                ? "Đang soạn câu hỏi cho em…"
                : pack.status === "ready"
                  ? "Bộ luyện đã sẵn sàng!"
                  : "Cùng hoàn thiện bộ luyện nhé"}
            </h2>
            <p>{pack.message}</p>
            <progress
              max={pack.count}
              value={pack.practiceCount}
              aria-label="Số câu đã tạo và kiểm tra"
            />
            <p>
              {pack.practiceCount}/{pack.count} câu đã tạo và kiểm tra
            </p>
            {pack.errors.map((message, i) => (
              <p className="notice error" key={i}>
                {message}
              </p>
            ))}
            {pack.status === "ready" && (
              <button className="button" disabled={busy} onClick={start}>
                Bắt đầu / Tiếp tục làm bài <ArrowRight size={18} />
              </button>
            )}
            {!working && pack.status !== "ready" && doc.canManage && (
              <button className="button" disabled={busy} onClick={retry}>
                Thử lại phần chưa xong
              </button>
            )}
            {working && (
              <p className="micro">
                Em có thể rời trang rồi mở lại bộ ôn này. Các phần đã tạo được
                giữ lại.
              </p>
            )}
          </section>
          <section className="card revision-sources">
            <h2>Nội dung ôn tập</h2>
            <div className="revision-selected">
              {pack.topics.map((topic) => (
                <span className="badge" key={topic}>
                  {topic}
                </span>
              ))}
            </div>
            <h3>Tài liệu nguồn</h3>
            {[
              ...new Map(
                doc.revision?.sources.map((s) => [s.documentId, s]),
              ).values(),
            ].map((s) => (
              <p key={s.documentId}>
                <Link
                  className="text-button"
                  href={`/tai-lieu/${s.documentId}`}
                >
                  <FileText size={16} />
                  {s.title} ↗
                </Link>
              </p>
            ))}
          </section>
          {!!view.runs.length && (
            <section className="section">
              <h2>Các lượt làm bài</h2>
              <div className="document-grid">
                {view.runs.map((run) => (
                  <Link
                    className="card document-card"
                    key={run.id}
                    href={`/luyen-tap/${id}/${run.id}`}
                  >
                    <span className="badge">
                      {run.finished ? "Xem kết quả" : "Tiếp tục làm bài"}
                    </span>
                    <h3>{run.title}</h3>
                    <p>
                      {run.solved}/{run.total} câu · {run.hints} lượt gợi ý
                    </p>
                    {run.finished && (
                      <p>
                        {run.score === null
                          ? "Tự đối chiếu"
                          : `${run.score}/10`}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
