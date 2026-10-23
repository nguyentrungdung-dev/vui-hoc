"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Rocket,
} from "lucide-react";
import type { PublicDocument } from "@/lib/documents";
import { sourceUrl } from "@/lib/revision";
import {
  emptyLearningAttempt,
  type LearningView,
  type RunView,
  type LearningResult,
} from "@/lib/learning";
import { ButtonLink, Character, Modal, PageTitle } from "./ui";
async function request<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`/api/documents${path}`, {
    cache: "no-store",
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const result = await r.json().catch(() => null);
  if (!r.ok)
    throw new Error(result?.error || "Chưa kết nối được máy chủ. Hãy thử lại.");
  return result;
}
const titles = {
  queued: "Đang chờ",
  generating: "Đang tạo bài học",
  ready: "Sẵn sàng học",
  partial: "Đã có một phần",
  failed: "Cần thử lại",
  waiting_config: "Chờ cấu hình AI",
};
export function LearningPanel({ document: doc }: { document: PublicDocument }) {
  const router = useRouter();
  const [view, setView] = useState<LearningView | null>(null);
  const [countInput, setCountInput] = useState(String(doc.practiceCount || 25));
  const count = Number(countInput);
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const hydrated = useRef(false);
  const available = [
    ...new Set([
      ...doc.questions.map((q) => q.topic),
      ...doc.pages.flatMap((p) => p.topics),
    ]),
  ];
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const next = await request<LearningView>(`/${doc.id}/learning`);
        if (!active) return;
        setView(next);
        if (!hydrated.current) {
          hydrated.current = true;
          if (next.pack) {
            setCountInput(String(next.pack.count));
            setTopics(next.pack.topics);
          }
        }
        if (next.pack && ["queued", "generating"].includes(next.pack.status))
          timer = setTimeout(refresh, 3000);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [doc.id, revision]);
  const pack = view?.pack;
  const working = !!pack && ["queued", "generating"].includes(pack.status);
  async function generate(retry = false) {
    setBusy(true);
    setError("");
    try {
      setView(
        await request<LearningView>(`/${doc.id}/generate`, {
          count: retry ? pack!.count : count,
          topics: retry ? pack!.topics : topics,
          retry,
        }),
      );
      setRevision((x) => x + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function start(kind: "original" | "practice") {
    setBusy(true);
    setError("");
    try {
      const run = await request<RunView>(`/${doc.id}/runs`, { kind });
      router.push(`/luyen-tap/${doc.id}/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card learning-panel">
      <span className="eyebrow">TỪ TÀI LIỆU → CÙNG EM LUYỆN TẬP</span>
      <h2>Lời giải và bài luyện của em</h2>
      <p>
        Mỗi câu có gợi ý từng mức và lời giải từng bước. Mình sẽ kiểm tra nội
        dung trước khi giao bài.
      </p>
      {doc.status === "partial" && (
        <p className="notice">
          Tài liệu mới được đọc một phần. Bài học chỉ dùng những trang đã nhận
          diện; các trang lỗi chưa được đưa vào.
        </p>
      )}
      {doc.canManage ? (
        <fieldset
          className="generation-options"
          disabled={busy || working || !view}
        >
          <label htmlFor={`practice-count-${doc.id}`}>Số câu luyện mới</label>
          <input
            id={`practice-count-${doc.id}`}
            className="question-count-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={countInput}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d*$/.test(value)) {
                setCountInput(value.replace(/^0+(?=\d)/, ""));
              }
            }}
          />
          <details>
            <summary>
              Chọn chủ đề ·{" "}
              {topics.length
                ? `${topics.length}/${available.length}`
                : "Tất cả"}
            </summary>
            <p className="micro">
              Để trống lựa chọn nghĩa là học tất cả chủ đề đã nhận diện.
            </p>
            <div className="topic-checklist">
              {available.map((t) => (
                <label key={t}>
                  <input
                    type="checkbox"
                    checked={topics.includes(t)}
                    onChange={(e) =>
                      setTopics((ts) =>
                        e.target.checked
                          ? [...ts, t]
                          : ts.filter((x) => x !== t),
                      )
                    }
                  />
                  {t}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => setTopics([])}
            >
              Chọn tất cả chủ đề
            </button>
          </details>
          <button
            className="button"
            disabled={!Number.isInteger(count) || count < 5 || count > 50}
            onClick={() => generate()}
          >
            <Rocket size={18} />
            {pack ? "Tạo theo lựa chọn" : "Tạo lời giải và bộ luyện"}
          </button>
        </fieldset>
      ) : (
        <p className="notice">
          {pack
            ? "Em có thể tiếp tục các bài bên dưới. Bài làm, điểm và lịch sử dùng chung trên mọi trình duyệt, thiết bị."
            : "Người tải tài liệu đang chuẩn bị bài luyện. Em có thể xem nội dung nhận diện và tài liệu gốc trước nhé."}
        </p>
      )}
      {pack && (
        <div className="generation-status">
          <span className="badge">
            {working && <LoaderCircle className="spin" size={16} />}{" "}
            {titles[pack.status]}
          </span>
          <p role="status">{pack.message}</p>
          <progress value={pack.completedParts} max={pack.totalParts || 1} />
          <p>
            {pack.originalCount} câu nguồn có lời giải · {pack.practiceCount}/
            {pack.count} câu luyện đã kiểm tra
          </p>
          <div className="actions">
            {pack.originalCount > 0 && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => start("original")}
              >
                Làm {pack.originalCount} câu gốc
              </button>
            )}
            {pack.practiceCount > 0 && (
              <button
                className="button"
                disabled={busy}
                onClick={() => start("practice")}
              >
                Luyện {pack.practiceCount} câu <ArrowRight size={18} />
              </button>
            )}
            {doc.canManage &&
              ["partial", "failed", "waiting_config"].includes(pack.status) && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => generate(true)}
                >
                  <RefreshCw size={17} /> Thử lại phần chưa xong
                </button>
              )}
          </div>
          {working && (
            <p className="micro">
              Em có thể về thư viện rồi quay lại. Các phần đã xong được lưu; bộ
              tạo bài được tiếp tục và lưu lại theo từng phần.
            </p>
          )}
          {pack.errors.length > 0 && (
            <details className="learning-issues">
              <summary>Phần chưa đạt kiểm tra ({pack.errors.length})</summary>
              {pack.errors.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
            </details>
          )}
          {pack.skipped.length > 0 && (
            <details className="learning-issues">
              <summary>
                {pack.skipped.length} câu chưa đủ điều kiện tạo lời giải
              </summary>
              {pack.skipped.map((s) => (
                <p key={s.sourceId}>
                  <strong>
                    {view?.sources.find((q) => q.id === s.sourceId)?.label ||
                      s.sourceId}
                    :
                  </strong>{" "}
                  {s.reason}
                </p>
              ))}
            </details>
          )}
        </div>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!!view?.runs.length && (
        <div className="saved-runs">
          <h3>Bài đang làm và kết quả</h3>
          {view.runs.slice(0, 8).map((r) => (
            <Link key={r.id} href={`/luyen-tap/${doc.id}/${r.id}`}>
              {r.kind === "original"
                ? "Đề gốc"
                : r.kind === "similar"
                  ? "Bài tương tự"
                  : "Bộ luyện"}{" "}
              · {r.solved}/{r.total} câu ·{" "}
              {r.finished
                ? `Kết quả ${r.score === null ? "tự đối chiếu" : `${r.score}/10`}`
                : "Tiếp tục học"}{" "}
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
export function RealPracticePage({
  documentId,
  runId,
  character,
}: {
  documentId: string;
  runId: string;
  character: number;
}) {
  const router = useRouter();
  const [run, setRun] = useState<RunView | null>(null);
  const [doc, setDoc] = useState<PublicDocument | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [entry, setEntry] = useState("");
  const [hint, setHint] = useState(false);
  const [explain, setExplain] = useState(false);
  const [finish, setFinish] = useState(false);
  const [translation, setTranslation] = useState(false);
  const [feedback, setFeedback] = useState("");
  const current = useRef<RunView | null>(null);
  const hintVisible = useRef(false);
  const failedAction = useRef<{
    payload: Record<string, unknown>;
    after?: () => void;
  } | null>(null);
  const endpoint = `/${documentId}/runs/${runId}`;
  useEffect(() => {
    let active = true;
    Promise.all([
      request<RunView>(endpoint),
      request<PublicDocument>(`/${documentId}`),
    ])
      .then(async ([loaded, d]) => {
        let r = loaded;
        if (
          !r.finished &&
          Object.values(r.attempts).some((a) => a.hintOpenedAt !== undefined)
        ) {
          r = await request<RunView>(endpoint, {
            eventId: crypto.randomUUID(),
            action: "close_hint",
            questionId: r.questions[r.index].id,
          });
        }
        if (active) {
          setRun(r);
          setEntry(r.attempts[r.questions[r.index].id]?.last || "");
          current.current = r;
          setDoc(d);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [endpoint, documentId]);
  useEffect(() => {
    const close = () => {
      const r = current.current;
      if (hintVisible.current && r && !r.finished) {
        hintVisible.current = false;
        setHint(false);
        void fetch(`/api/documents${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: crypto.randomUUID(),
            action: "close_hint",
            questionId: r.questions[r.index].id,
          }),
          keepalive: true,
        });
      }
    };
    window.addEventListener("pagehide", close);
    const visibility = () => {
      if (document.visibilityState === "hidden") close();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pagehide", close);
      document.removeEventListener("visibilitychange", visibility);
      close();
    };
  }, [endpoint]);
  async function act(payload: Record<string, unknown>, after?: () => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    const sent = {
      ...payload,
      eventId: payload.eventId || crypto.randomUUID(),
    };
    try {
      const next = await request<RunView>(endpoint, sent);
      setRun(next);
      current.current = next;
      failedAction.current = null;
      after?.();
      return next;
    } catch (e) {
      failedAction.current = { payload: sent, after };
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function similar() {
    setBusy(true);
    setError("");
    try {
      const next = await request<RunView>(`/${documentId}/runs`, {
        kind: "similar",
        sourceId: run!.questions[run!.index].id,
      });
      router.push(`/luyen-tap/${documentId}/${next.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!run)
    return (
      <div className="card empty-state">
        <p role="status">{error || "Đang mở bài học…"}</p>
        <ButtonLink href={`/tai-lieu/${documentId}`}>Về tài liệu</ButtonLink>
      </div>
    );
  const q = run.questions[run.index];
  const a = run.attempts[q.id] || emptyLearningAttempt();
  function navigate(index: number) {
    void act({ action: "go", index }, () => {
      const latest = current.current;
      setEntry(latest?.attempts[latest.questions[latest.index].id]?.last || "");
      setFeedback("");
      setTranslation(false);
      setExplain(false);
      setHint(false);
      hintVisible.current = false;
    });
  }
  async function closeHint() {
    await act({ action: "close_hint", questionId: q.id }, () => {
      setHint(false);
      hintVisible.current = false;
    });
  }
  const lessonHref = doc?.revision
    ? `/luyen-tap/bo/${documentId}`
    : `/tai-lieu/${documentId}`;
  const source = (page: number) => {
    const original = doc?.revision?.sources.find((s) => s.page === page);
    if (original) return sourceUrl(original);
    const pdf = doc?.files[0]?.mime === "application/pdf";
    return `/api/documents/${documentId}/files/${pdf ? 0 : page - 1}${pdf ? `#page=${page}` : ""}`;
  };
  const sourceLabel = (page: number) => {
    const original = doc?.revision?.sources.find((s) => s.page === page);
    return original
      ? `${original.title} · trang ${original.sourcePage}`
      : `Trang nguồn ${page}`;
  };
  if (run.finished)
    return (
      <>
        <PageTitle
          eyebrow="MỖI NGÀY MỘT CHÚT"
          title="Cùng nhìn lại bài học nhé!"
        >
          {run.title}
        </PageTitle>
        <section className="card real-results">
          <Character index={character} />
          <div>
            <span className="eyebrow">ĐIỂM LẦN TRẢ LỜI ĐẦU</span>
            <h2>
              {run.result.score === null
                ? "Tự đối chiếu"
                : `${run.result.score}/10`}
            </h2>
            <p>
              {run.result.firstCorrect}/{run.result.gradable} câu chấm tự động
              đúng ngay lần đầu · {run.result.total - run.result.gradable} câu
              tự đối chiếu
            </p>
            <p>
              {run.result.hints} lượt gợi ý ·{" "}
              {Math.round(run.result.hintMs / 1000)} giây xem gợi ý ·{" "}
              {run.result.independent} câu đúng độc lập
            </p>
            <p className="micro">
              Gợi ý không trừ điểm. Câu bỏ qua tính chưa đúng; câu tự đối chiếu
              không nằm trong điểm /10.
            </p>
          </div>
        </section>
        <section className="card topic-results">
          <h2>Theo từng dạng bài</h2>
          {run.result.byTopic.map((t) => (
            <p key={t.topic}>
              <strong>{t.topic}</strong> ·{" "}
              {t.gradable
                ? `${t.correct}/${t.gradable} câu chấm tự động đúng lần đầu`
                : `${t.total} câu tự đối chiếu`}{" "}
              · {t.hints} lượt gợi ý
            </p>
          ))}
        </section>
        <div className="actions">
          <ButtonLink href={lessonHref}>
            Về bài học <ArrowLeft size={17} />
          </ButtonLink>
          <ButtonLink href="/hanh-trinh" secondary>
            Xem hành trình
          </ButtonLink>
        </div>
        <section className="section">
          <h2>Đáp án và lời giải</h2>
          {run.questions.map((item, i) => (
            <details className="card source-details" key={item.id}>
              <summary>
                Câu {i + 1} · {item.topic} ·{" "}
                {run.attempts[item.id]?.firstCorrect
                  ? "Đúng lần đầu"
                  : item.grading === "self_review"
                    ? "Tự đối chiếu"
                    : "Cùng ôn lại"}
              </summary>
              <p className="source-text">{item.prompt}</p>
              {item.passage && <p className="source-passage">{item.passage}</p>}
              <p>
                Đáp án:{" "}
                <strong>
                  {item.solution?.answer}
                  {item.grading === "choice"
                    ? " · " +
                      item.options.find(
                        (o) => o.label === item.solution?.answer,
                      )?.text
                    : ""}
                </strong>
              </p>
              <ol className="solution-steps">
                {item.solution?.steps.map((s, j) => (
                  <li key={j}>
                    <b>{j + 1}</b>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <p>{item.solution?.explanation}</p>
              {item.solution?.englishSteps.length ? (
                <div lang="en">
                  <strong>English explanation</strong>
                  <ol>
                    {item.solution.englishSteps.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {item.sourcePages.map((p) => (
                <a
                  className="text-button"
                  key={p}
                  href={source(p)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {sourceLabel(p)} ↗
                </a>
              ))}
            </details>
          ))}
        </section>
      </>
    );
  return (
    <>
      <div className="practice-top">
        <ButtonLink href={lessonHref} secondary>
          <ArrowLeft size={16} /> Lưu và về menu
        </ButtonLink>
        <span className="badge">
          {run.kind === "original"
            ? "Câu gốc từ tài liệu"
            : run.kind === "similar"
              ? "Luyện câu tương tự"
              : "Bộ luyện từ tài liệu"}
        </span>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => setFinish(true)}
        >
          Kết thúc bài
        </button>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
          {failedAction.current && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                const f = failedAction.current!;
                void act(f.payload, f.after);
              }}
            >
              Gửi lại thao tác
            </button>
          )}
        </div>
      )}
      <div className="practice-progress">
        <div>
          <strong>
            Câu {run.index + 1}
            <span> / {run.questions.length}</span>
          </strong>
          <span>{run.result.solved} câu đã hoàn thành</span>
        </div>
        <div className="progress-track">
          <span
            style={{
              width: `${(run.result.solved / run.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>
      <div className="quiz-layout">
        <section className="card question-card">
          <div className="card-top">
            <span className="badge blue">{q.topic}</span>
            <span className="micro">
              {q.advanced ? "Thử thách nâng cao" : "Củng cố kiến thức"}
            </span>
          </div>
          <h1 className="question-text">{q.prompt}</h1>
          {q.passage && q.passage !== q.prompt && (
            <p className="source-passage">{q.passage}</p>
          )}
          {!!q.translation && (
            <>
              <button
                className="text-button"
                onClick={() => setTranslation(!translation)}
              >
                {translation ? "Ẩn bản dịch" : "Xem bản dịch tiếng Việt"}
              </button>
              {translation && <p className="source-passage">{q.translation}</p>}
            </>
          )}
          {q.hasFigure && (
            <div className="figure-notice">
              <p>{q.figureDescription}</p>
              {doc?.files[0]?.mime.startsWith("image/") &&
                q.sourcePages.map((p) => (
                  <img key={p} src={source(p)} alt={`Hình trong trang ${p}`} />
                ))}
              {q.sourcePages.map((p) => (
                <a href={source(p)} key={p} target="_blank" rel="noreferrer">
                  Mở hình gốc · Trang {p} ↗{" "}
                </a>
              ))}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const next = await act({
                action: "answer",
                questionId: q.id,
                answer: entry,
              });
              if (next)
                setFeedback(
                  next.attempts[q.id]?.solved
                    ? "Đúng rồi! Em đã tìm ra đáp án."
                    : "Chưa đúng rồi. Em thử lại nhé, hoặc mở một gợi ý nhỏ.",
                );
            }}
          >
            {q.grading === "choice" ? (
              <div className="answer-grid">
                {q.options.map((o) => (
                  <button
                    type="button"
                    className={`answer answer-option ${entry === o.label ? "selected" : ""} ${a.solved && a.last === o.label ? "correct" : ""}`}
                    aria-pressed={entry === o.label}
                    key={o.label}
                    disabled={busy || a.solved || a.guided}
                    onClick={() => setEntry(o.label)}
                  >
                    <span>{o.label}</span>
                    <strong>{o.text}</strong>
                  </button>
                ))}
              </div>
            ) : q.grading === "exact" ? (
              <label className="field numeric-answer">
                Đáp án của em
                <input
                  value={entry}
                  disabled={busy || a.solved || a.guided}
                  onChange={(e) => setEntry(e.target.value)}
                  maxLength={4000}
                  placeholder="Nhập đáp án ở đây"
                />
              </label>
            ) : (
              <div className="notice">
                <strong>Câu này có nhiều cách trả lời.</strong>
                <p>
                  Em làm trên giấy hoặc tự nói câu trả lời, rồi mở hướng dẫn để
                  đối chiếu. Câu này không tính vào điểm /10.
                </p>
              </div>
            )}
            <div
              className={`answer-feedback ${a.solved ? "success" : feedback ? "retry" : ""}`}
              role="status"
            >
              {a.solved
                ? a.guided
                  ? "Mình đã cùng hoàn thành. Em thử một câu tương tự nhé!"
                  : "Đúng rồi! Em đã tìm ra đáp án."
                : feedback}
            </div>
            <div className="question-actions">
              {!a.solved && !a.guided ? (
                <>
                  {q.grading !== "self_review" && (
                    <button
                      className="button"
                      disabled={busy || !entry.trim()}
                      type="submit"
                    >
                      Kiểm tra đáp án <CheckCircle2 size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="hint-button"
                    disabled={busy}
                    onClick={async () => {
                      const next = await act({
                        action: "hint",
                        questionId: q.id,
                      });
                      if (next) {
                        setHint(true);
                        hintVisible.current = true;
                      }
                    }}
                  >
                    <Lightbulb size={20} /> Gợi ý nhỏ
                  </button>
                  {q.grading === "self_review" && (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        act({ action: "guide", questionId: q.id }, () =>
                          setExplain(true),
                        )
                      }
                    >
                      Em đã thử · Xem hướng dẫn
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => setExplain(true)}
                  >
                    <Lightbulb size={18} /> Vì sao? Xem giải thích
                  </button>
                  {a.solved && (
                    <button
                      type="button"
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        run.index < run.questions.length - 1
                          ? navigate(run.index + 1)
                          : setFinish(true)
                      }
                    >
                      {run.index < run.questions.length - 1
                        ? "Câu tiếp theo"
                        : "Xem kết quả"}{" "}
                      <ArrowRight size={18} />
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
          {a.solved && (
            <button className="text-button" disabled={busy} onClick={similar}>
              Làm câu tương tự từ bộ luyện <Rocket size={17} />
            </button>
          )}
          <div className="question-bottom">
            <button
              className="text-button"
              disabled={busy || run.index === 0}
              onClick={() => navigate(run.index - 1)}
            >
              ← Câu trước
            </button>
            {!a.solved && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  run.index < run.questions.length - 1
                    ? navigate(run.index + 1)
                    : setFinish(true)
                }
              >
                Để sau, mình thử câu khác →
              </button>
            )}
          </div>
          <p className="micro">
            Đã lưu tiến độ trên máy chủ.{" "}
            {q.sourcePages.map((p) => (
              <a key={p} href={source(p)} target="_blank" rel="noreferrer">
                {sourceLabel(p)} ↗{" "}
              </a>
            ))}
          </p>
        </section>
        <aside className="quiz-aside">
          <div className="card buddy-card">
            <Character index={character} />
            <h3>Cứ bình tĩnh, em nhé!</h3>
            <p>
              Mở gợi ý không bị trừ điểm. Mỗi lần thử là một lần mình hiểu hơn.
            </p>
            <span className="badge">{a.hintOpens} lượt mở gợi ý</span>
          </div>
          <div className="card question-map">
            <h3>Bản đồ câu hỏi</h3>
            <div>
              {run.questions.map((item, i) => (
                <button
                  disabled={busy}
                  key={item.id}
                  aria-label={`Đến câu ${i + 1}`}
                  aria-current={run.index === i ? "step" : undefined}
                  className={`${run.index === i ? "current" : ""} ${run.attempts[item.id]?.solved ? "solved" : ""}`}
                  onClick={() => navigate(i)}
                >
                  {run.attempts[item.id]?.solved ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    i + 1
                  )}
                </button>
              ))}
            </div>
            <small>Xanh: đã hoàn thành · Viền xanh: đang làm</small>
          </div>
        </aside>
      </div>
      {hint && (
        <Modal
          title="Một gợi ý nhỏ cho em 💡"
          onClose={() => {
            if (!busy) void closeHint();
          }}
        >
          <div className="hint-content">
            <span className="badge">Gợi ý {a.hintLevel}/3</span>
            <p>{q.hint}</p>
            <button className="button full" disabled={busy} onClick={closeHint}>
              Em thử tự làm lại nhé <ArrowRight size={17} />
            </button>
            <button
              className="text-button guide-button"
              disabled={busy}
              onClick={() =>
                act({ action: "guide", questionId: q.id }, () => {
                  setHint(false);
                  hintVisible.current = false;
                  setExplain(true);
                })
              }
            >
              Con vẫn chưa hiểu — Cùng làm từng bước
            </button>
          </div>
        </Modal>
      )}
      {explain && q.solution && (
        <Modal
          title={a.guided ? "Cùng làm từng bước" : "Vì sao đáp án đúng?"}
          onClose={() => setExplain(false)}
        >
          <p>
            Đáp án:{" "}
            <strong>
              {q.solution.answer}
              {q.grading === "choice"
                ? " · " +
                  q.options.find((o) => o.label === q.solution!.answer)?.text
                : ""}
            </strong>
          </p>
          <ol className="solution-steps">
            {q.solution.steps.map((s, i) => (
              <li key={i}>
                <b>{i + 1}</b>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p>{q.solution.explanation}</p>
          {q.solution.englishSteps.length > 0 && (
            <div className="english-solution" lang="en">
              <strong>English explanation</strong>
              <ol>
                {q.solution.englishSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          {a.guided && !a.solved ? (
            <button
              className="button full"
              disabled={busy}
              onClick={() =>
                act({ action: "understood", questionId: q.id }, () =>
                  setExplain(false),
                )
              }
            >
              Mình đã hiểu các bước <CheckCircle2 size={18} />
            </button>
          ) : (
            <button className="button full" onClick={() => setExplain(false)}>
              Em hiểu rồi <CheckCircle2 size={18} />
            </button>
          )}
        </Modal>
      )}
      {finish && (
        <Modal
          title="Nhìn lại hành trình nhé?"
          onClose={() => setFinish(false)}
        >
          <p>
            Em đã hoàn thành {run.result.solved}/{run.questions.length} câu. Các
            câu chấm tự động chưa trả lời được tính là chưa đúng. Câu tự đối
            chiếu không tính vào điểm /10.
          </p>
          <p>Điểm lần đầu và mức dùng gợi ý được ghi riêng.</p>
          <div className="actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setFinish(false)}
            >
              Làm tiếp
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => act({ action: "finish" }, () => setFinish(false))}
            >
              Kết thúc và xem kết quả
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function LearningHistory() {
  const [runs, setRuns] = useState<LearningResult[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    request<{ runs: LearningResult[] }>("/history")
      .then((r) => setRuns(r.runs))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="section">
      <PageTitle eyebrow="TỪ TÀI LIỆU CỦA EM" title="Hành trình học tập">
        Bài đang làm và kết quả dùng chung trên mọi trình duyệt, thiết bị.
      </PageTitle>
      {error && <p className="notice error">{error}</p>}
      {runs.length ? (
        <div className="document-grid">
          {runs.map((r) => (
            <Link
              className="card document-card"
              key={r.id}
              href={`/luyen-tap/${r.documentId}/${r.id}`}
            >
              <span className="badge">
                {r.finished ? "Đã kết thúc" : "Tiếp tục học"}
              </span>
              <h3>{r.title}</h3>
              <p>
                {r.kind === "original"
                  ? "Đề gốc"
                  : r.kind === "similar"
                    ? "Bài tương tự"
                    : "Bộ luyện"}{" "}
                · {r.solved}/{r.total} câu
              </p>
              {r.finished && (
                <p>
                  {r.score === null ? "Tự đối chiếu" : `${r.score}/10`} ·{" "}
                  {r.hints} lượt gợi ý
                </p>
              )}
              <small>{new Date(r.date).toLocaleString("vi-VN")}</small>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <p>Chọn một tài liệu đã nhận diện để tạo bài học đầu tiên nhé.</p>
          <ButtonLink href="/thu-vien">Đến thư viện</ButtonLink>
        </div>
      )}
    </section>
  );
}
