"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { Award, ChevronDown, X, RefreshCw, Glyph, MedalArtwork } from "./icons";
import type {
  AchievementView,
  MedalView,
  RankingView,
  RankingRow,
} from "@/lib/achievements";
import { subjects, type Subject } from "@/lib/documents";
import { useAccount } from "./account";
import { Character, Modal, PageTitle } from "./ui";
export async function achievementRequest<T>(
  query = "",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api/achievements" + query, {
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Chưa tải được thành tích.");
  return data;
}
export function AchievementMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const canHover = () =>
    window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 901px)",
    ).matches;
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return (
    <div
      ref={root}
      className="practice-menu"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && canHover()) setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (
          e.pointerType === "mouse" &&
          canHover() &&
          !root.current?.contains(document.activeElement)
        )
          setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          root.current?.querySelector("button")?.focus();
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
          requestAnimationFrame(() =>
            root.current?.querySelector("a")?.focus(),
          );
        }
      }}
    >
      <button
        className={`practice-menu-trigger ${path.startsWith("/thanh-tich") ? "active" : ""}`}
        aria-expanded={open}
        aria-controls="achievement-dropdown"
        onClick={() => setOpen(!open)}
      >
        <Award size={18} /> Thành tích <ChevronDown size={14} />
      </button>
      <div
        id="achievement-dropdown"
        className="practice-dropdown"
        hidden={!open}
      >
        <Link href="/thanh-tich/xep-hang">
          <Glyph token="ranking" />
          <span>
            <strong>Xếp hạng</strong>
            <small>Cùng các bạn trong khối tiến bộ</small>
          </span>
        </Link>
        <Link href="/thanh-tich/huy-chuong">
          <Award />
          <span>
            <strong>Huy chương</strong>
            <small>Bảng vàng của riêng em</small>
          </span>
        </Link>
      </div>
    </div>
  );
}
export function AchievementNotice() {
  const { user } = useAccount();
  const [pending, setPending] = useState<MedalView[]>([]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (!user) return;
    let active = true;
    let fetching = false;
    async function refresh() {
      if (fetching) return;
      fetching = true;
      try {
        const view = await achievementRequest<AchievementView>();
        const fresh = view.medals.filter(
          (m) => m.earnedAt && !m.notified && !seen.current.has(m.id),
        );
        if (active) {
          fresh.forEach((m) => seen.current.add(m.id));
          setPending((p) => [
            ...p.filter((m) =>
              view.medals.some((v) => v.id === m.id && !v.notified),
            ),
            ...fresh,
          ]);
        }
      } catch {
      } finally {
        fetching = false;
      }
    }
    void refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("vuihoc-achievements", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("vuihoc-achievements", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [user]);
  if (!pending.length) return null;
  async function dismiss() {
    try {
      await achievementRequest("", {
        ids: pending.map((m) => m.id),
        kind: "notified",
      });
      setPending([]);
    } catch {}
  }
  return (
    <aside className="medal-notice" role="status">
      <span className="medal-notice-icon">
        <MedalArtwork id={pending[0].id} size={48} />
      </span>
      <div>
        <strong>
          {pending.length > 1
            ? `Em vừa đạt ${pending.length} huy chương!`
            : `Em vừa đạt ${pending[0].name}!`}
        </strong>
        <p>Một bước tiến thật đáng tự hào.</p>
        <Link href="/thanh-tich/huy-chuong" onClick={() => void dismiss()}>
          Xem huy chương →
        </Link>
      </div>
      <button
        className="icon-button"
        aria-label="Đóng thông báo huy chương"
        onClick={() => void dismiss()}
      >
        <X size={18} />
      </button>
    </aside>
  );
}
export function MedalPage() {
  const { notify } = useAccount();
  const [view, setView] = useState<AchievementView | null>(null);
  const [error, setError] = useState("");
  const [group, setGroup] = useState("Tất cả");
  const [selected, setSelected] = useState<MedalView | null>(null);
  const [celebrate, setCelebrate] = useState<MedalView[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await achievementRequest<AchievementView>();
      setView(data);
      setError("");
      setCelebrate(data.medals.filter((m) => m.earnedAt && !m.celebrated));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function closeCelebration() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await achievementRequest<AchievementView>("", {
        ids: celebrate.map((m) => m.id),
        kind: "celebrated",
      });
      setView(data);
      setCelebrate([]);
      window.dispatchEvent(new Event("vuihoc-achievements"));
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const earned = view?.medals.filter((m) => m.earnedAt).length || 0;
  const nearest = view?.medals
    .filter((m) => !m.earnedAt)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];
  return (
    <div className="achievements-page">
      <PageTitle eyebrow="MỖI NỖ LỰC ĐỀU TỎA SÁNG" title="Bảng vàng huy chương">
        Một chút kiên trì mỗi ngày, một bộ sưu tập đầy tự hào.
      </PageTitle>
      {error ? (
        <div role="alert" className="card">
          <p>{error}</p>
          <button className="button secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Thử lại
          </button>
        </div>
      ) : !view ? (
        <p role="status">Đang mở hộp huy chương của em…</p>
      ) : (
        <>
          <section className="medal-summary card">
            <span className="summary-medal" aria-hidden="true">
              <MedalArtwork id="first-star" size={70} />
            </span>
            <div>
              <span className="eyebrow">HÀNH TRÌNH CỦA EM</span>
              <h2>
                {earned}
                <small> / 20 huy chương</small>
              </h2>
              <progress
                value={earned}
                max={20}
                aria-label="Tổng huy chương đã đạt"
              />
              <p>
                {earned === 20
                  ? "Bộ sưu tập đã đủ đầy. Em thật kiên trì!"
                  : "Mỗi huy chương là một câu chuyện em đã cố gắng."}
              </p>
            </div>
            {nearest && (
              <div className="nearest-medal">
                <span>SẮP CHẠM TỚI</span>
                <strong>
                  <Glyph token={nearest.icon} size={24} /> {nearest.name}
                </strong>
                <p>
                  {nearest.progress}/{nearest.target} · {nearest.reason}
                </p>
              </div>
            )}
          </section>
          <div className="medal-filters" aria-label="Nhóm huy chương">
            {[
              "Tất cả",
              "Khởi đầu",
              "Tiến bộ",
              "Kiên trì",
              "Khám phá",
              "Chinh phục",
            ].map((g) => (
              <button
                key={g}
                aria-pressed={group === g}
                className={group === g ? "selected" : ""}
                onClick={() => setGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="medal-grid">
            {view.medals
              .filter((m) => group === "Tất cả" || m.group === group)
              .map((m) => (
                <button
                  key={m.id}
                  className={`medal-card ${m.earnedAt ? "earned" : "locked"}`}
                  onClick={() => setSelected(m)}
                >
                  <span
                    className={`medal-art tone-${["Khởi đầu", "Tiến bộ", "Kiên trì", "Khám phá", "Chinh phục"].indexOf(m.group)}`}
                  >
                    <MedalArtwork id={m.id} />
                  </span>
                  <span className="medal-state">
                    {m.earnedAt ? "Đã đạt" : "Đang chinh phục"}
                  </span>
                  <h2>{m.name}</h2>
                  <p>{m.reason}</p>
                  <progress
                    value={m.progress}
                    max={m.target}
                    aria-label={`Tiến trình ${m.name}`}
                  />
                  <small>
                    {m.progress}/{m.target}
                    {m.earnedAt
                      ? ` · ${new Date(m.earnedAt).toLocaleDateString("vi-VN")}`
                      : ""}
                  </small>
                </button>
              ))}
          </div>
          <p className="micro medal-footnote">
            Mỗi câu và mỗi bộ câu hỏi chỉ tính một lần. Mở hint hoặc lời giải sẽ
            không tính thành tích tự giải cho câu đó, kể cả khi làm lại. Thành
            tích hiện tính từ các môn học; TIMO sẽ có khu thi đua riêng sau.
          </p>
        </>
      )}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div
            className={`medal-detail ${selected.earnedAt ? "earned" : "locked"}`}
          >
            <span className="medal-art tone-0">
              <MedalArtwork id={selected.id} />
            </span>
            <p>{selected.reason}</p>
            <progress
              value={selected.progress}
              max={selected.target}
              aria-label="Tiến trình huy chương"
            />
            <p>
              {selected.progress}/{selected.target}
            </p>
            {selected.earnedAt ? (
              <>
                <p>
                  Đạt ngày{" "}
                  {new Date(selected.earnedAt).toLocaleDateString("vi-VN")}
                </p>
                <button
                  className="button"
                  onClick={() => {
                    setCelebrate([selected]);
                    setSelected(null);
                  }}
                >
                  Ăn mừng lại
                </button>
              </>
            ) : (
              <Link className="button" href="/luyen-tap/on-bai">
                Cùng học tiếp nào
              </Link>
            )}
          </div>
        </Modal>
      )}
      {celebrate.length > 0 && (
        <Modal
          title="Hoan hô, em làm được rồi!"
          onClose={() => void closeCelebration()}
        >
          <div className="medal-celebration">
            <div className="medal-confetti" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    left: `${i * 5.6}%`,
                    animationDelay: `${(i % 5) * 0.17}s`,
                    background: ["#fecdd3", "#fde68a", "#bbf7d0", "#ddd6fe"][
                      i % 4
                    ],
                  }}
                />
              ))}
            </div>
            <p>Mỗi lần cố gắng, em lại tỏa sáng hơn.</p>
            {celebrate.map((m) => (
              <div className="celebration-award" key={m.id}>
                <span className="medal-art tone-0">
                  <MedalArtwork id={m.id} />
                </span>
                <h2>{m.name}</h2>
                <p>{m.reason}</p>
              </div>
            ))}
            <button
              disabled={busy}
              className="button full"
              onClick={() => void closeCelebration()}
            >
              {busy ? "Đang lưu…" : "Cất vào bộ sưu tập"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function RankingPage() {
  const { user } = useAccount();
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [period, setPeriod] = useState<"week" | "all">("week");
  const [view, setView] = useState<RankingView | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setView(null);
    setError("");
    achievementRequest<RankingView>(
      `?view=ranking&subject=${subject}&period=${period}`,
    )
      .then((data) => {
        if (active) setView(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [subject, period, retry, user?.id, user?.nickname, user?.character]);
  function row(r: RankingRow) {
    return (
      <tr key={r.id} className={r.mine ? "my-ranking" : ""}>
        <td>
          <span className="ranking-rank">
            {r.rank <= 3 && (
              <MedalArtwork
                id={
                  r.rank === 1
                    ? "first-star"
                    : r.rank === 2
                      ? "first-journey"
                      : "little-brave"
                }
                size={27}
              />
            )}
            <span>{r.rank}</span>
          </span>
        </td>
        <td>
          <div className="ranking-student">
            <Character index={r.character} />
            <strong>
              {r.nickname}
              {r.mine && <small> · Em</small>}
            </strong>
          </div>
        </td>
        <td>{r.points.toLocaleString("vi-VN")}</td>
        <td>
          {r.medals} <Award size={16} />
        </td>
      </tr>
    );
  }
  return (
    <div className="achievements-page">
      <PageTitle
        eyebrow={`CÙNG NHAU TIẾN BỘ · KHỐI ${user?.grade}`}
        title="Bảng xếp hạng"
      >
        Cùng các bạn cố gắng. Mỗi bước tiến của em đều đáng tự hào.
      </PageTitle>
      <div className="ranking-controls card">
        <label className="field">
          Môn thi đua
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject | "all")}
          >
            <option value="all">Tất cả môn học</option>
            {Object.entries(subjects).map(([id, s]) => (
              <option value={id} key={id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="medal-filters">
          <button
            aria-pressed={period === "week"}
            className={period === "week" ? "selected" : ""}
            onClick={() => setPeriod("week")}
          >
            Tuần này
          </button>
          <button
            aria-pressed={period === "all"}
            className={period === "all" ? "selected" : ""}
            onClick={() => setPeriod("all")}
          >
            Toàn thời gian
          </button>
        </div>
      </div>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            className="button secondary"
            onClick={() => setRetry((n) => n + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : !view ? (
        <p role="status">Đang tập hợp những ngôi sao khối {user?.grade}…</p>
      ) : (
        <>
          <div className="ranking-caption">
            <span>
              {view.participants} bạn cùng khối {view.grade}
            </span>
            <span>
              {period === "week"
                ? `Tuần bắt đầu ${new Date(view.weekStart + "T00:00:00").toLocaleDateString("vi-VN")} · Giờ Việt Nam`
                : "Mỗi nỗ lực đều được ghi nhớ"}
            </span>
          </div>
          {view.rows.some((r) => r.points > 0) ? (
            <div className="ranking-podium">
              {view.rows
                .filter((r) => r.rank <= 3 && r.points > 0)
                .slice(0, 3)
                .map((r) => (
                  <div className={`podium-place place-${r.rank}`} key={r.id}>
                    <span>
                      {
                        <MedalArtwork
                          id={
                            r.rank === 1
                              ? "first-star"
                              : r.rank === 2
                                ? "first-journey"
                                : "little-brave"
                          }
                          size={30}
                        />
                      }
                      <small className="podium-rank">Hạng {r.rank}</small>
                    </span>
                    <Character index={r.character} />
                    <strong>{r.nickname}</strong>
                    <p>{r.points} điểm</p>
                  </div>
                ))}
            </div>
          ) : (
            <div className="card ranking-empty">
              <Glyph token="🌱" size={48} />
              <h2>Chặng đua mới đang chờ!</h2>
              <p>
                Hoàn thành câu hỏi để thắp sáng bảng thi đua. Em tiến bộ hơn hôm
                qua là điều đáng tự hào nhất.
              </p>
              <Link className="button" href="/luyen-tap/on-bai">
                Bắt đầu học
              </Link>
            </div>
          )}
          <div className="card ranking-table">
            <table>
              <caption>
                Bảng thi đua khối {view.grade} ·{" "}
                {period === "week" ? "Tuần này" : "Toàn thời gian"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Hạng</th>
                  <th scope="col">Bạn học</th>
                  <th scope="col">Điểm</th>
                  <th scope="col">Huy chương</th>
                </tr>
              </thead>
              <tbody>{view.rows.map(row)}</tbody>
            </table>
          </div>
          {view.mine && !view.rows.some((r) => r.mine) && (
            <div className="card ranking-table">
              <table>
                <caption>Vị trí của em</caption>
                <tbody>{row(view.mine)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
      <details className="card ranking-rules">
        <summary>Điểm thi đua được tính thế nào?</summary>
        <p>
          Tự giải đúng ngay lần đầu: 10 điểm/câu thường, 20 điểm/câu khó. Tự sửa
          đúng sau khi làm sai: 5 hoặc 10 điểm. Có mở hint: 3 hoặc 6 điểm. Câu
          đã mở lời giải hoặc chưa chấm được không có điểm.
        </p>
        <p>
          Làm lại chỉ cộng phần điểm cải thiện, không cộng lặp. Câu đã mở hint
          không thể lấy lại điểm tự giải bằng cách tạo lượt làm mới. Không cộng
          điểm tốc độ hoặc điểm riêng cho huy chương. Hai bạn bằng điểm sẽ cùng
          hạng.
        </p>
        <p>
          Tuần mới bắt đầu vào thứ Hai, theo giờ Việt Nam. Bảng chỉ gồm tài
          khoản cùng khối với em, hiển thị tối đa 50 bạn và luôn có vị trí của
          em. TIMO sẽ có bảng riêng sau.
        </p>
      </details>
    </div>
  );
}
