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
} from "./icons";
import { similarDifficulties, type SimilarDifficulty } from "@/lib/similar";
import type { PublicDocument } from "@/lib/documents";
import { sourceUrl } from "@/lib/revision";
import {
  emptyLearningAttempt,
  type LearningView,
  type RunView,
  type LearningResult,
} from "@/lib/learning";
import { ButtonLink, Character, Modal, PageTitle } from "./ui";
import { QuestionSourceImages } from "./question-source-images";
import { RewardCelebration } from "./rewards";
import { HintHelpActions } from "./hint-help-actions";
import { GuidanceDialog, startGuidance } from "./guidance-player";
import type { GuidanceView } from "@/lib/guidance";
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
  if (body !== undefined)
    window.dispatchEvent(new Event("vuihoc-achievements"));
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
export function LearningPanel({
  document: doc,
  topic = "",
}: {
  document: PublicDocument;
  topic?: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<LearningView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const next = await request<LearningView>(`/${doc.id}/learning`);
        if (!active) return;
        setView(next);
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
  }, [doc.id, doc.status, revision]);
  const pack = view?.pack;
  const working = !!pack && ["queued", "generating"].includes(pack.status);
  async function generate(retry = false, original = false) {
    setBusy(true);
    setError("");
    try {
      if (original) {
        await request(`/${doc.id}/reanalyze`, {});
        window.location.reload();
        return;
      }
      setView(
        await request<LearningView>(`/${doc.id}/generate`, {
          count: pack?.count || 0,
          scope: pack?.count ? "practice" : "original",
          topics: pack?.topics || [],
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
      const run = await request<RunView>(`/${doc.id}/runs`, {
        kind,
        ...(kind === "original" && topic ? { topic } : {}),
      });
      router.push(`/luyen-tap/${doc.id}/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const questionCount = topic
    ? doc.questions.filter((q) => q.topic === topic).length
    : pack?.originalCount || 0;
  const canStart =
    !!pack &&
    pack.originalCount > 0 &&
    questionCount > 0 &&
    !working &&
    !["queued", "preparing", "analyzing"].includes(doc.status);
  return (
    <section className="card learning-panel lesson-launcher">
      <div className="lesson-launcher-heading">
        <span className="lesson-launcher-icon">
          <Rocket size={28} aria-hidden="true" />
        </span>
        <div>
          <span className="eyebrow">BÀI TẬP CỦA EM</span>
          <h2>{topic || "Sẵn sàng thử sức?"}</h2>
          <p>
            {questionCount > 0
              ? `${questionCount} câu hỏi · Làm theo nhịp của em`
              : "Bài tập từ tài liệu của em"}
          </p>
        </div>
      </div>
      {!view && !error && <p role="status">Đang mở bài tập…</p>}
      {working && (
        <div className="lesson-preparing" role="status">
          <span>
            <LoaderCircle size={16} className="spin" /> {pack.message}
          </span>
          <progress value={pack.completedParts} max={pack.totalParts || 1} />
        </div>
      )}
      {pack && !working && pack.status !== "ready" && (
        <p role="status">{pack.message}</p>
      )}
      {pack?.status === "ready" && questionCount === 0 && (
        <p>Chủ đề này chưa có câu hỏi để làm. Em thử chọn chủ đề khác nhé.</p>
      )}
      <div className="actions lesson-launch-actions">
        {canStart && (
          <button
            className="button"
            disabled={busy}
            onClick={() => start("original")}
          >
            {busy ? "Đang mở…" : "Bắt đầu làm bài"} <ArrowRight size={18} />
          </button>
        )}
        {!!pack?.practiceCount && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => start("practice")}
          >
            Bộ luyện thêm · {pack.practiceCount} câu
          </button>
        )}
        {doc.canManage &&
          view &&
          !pack &&
          ["complete", "partial"].includes(doc.status) && (
            <button
              className="button"
              disabled={busy}
              onClick={() => generate(false, true)}
            >
              Chuẩn bị bài tập
            </button>
          )}
        {doc.canManage &&
          pack &&
          ["partial", "failed", "waiting_config"].includes(pack.status) && (
            <button
              className="button secondary"
              disabled={busy || working}
              onClick={() => generate(true)}
            >
              <RefreshCw size={17} /> Thử lại
            </button>
          )}
        {doc.canManage && pack && pack.contentVersion !== 2 && (
          <button
            className="button secondary"
            disabled={busy || working}
            onClick={() => generate(false, true)}
          >
            Cập nhật bài tập
          </button>
        )}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {pack && (
        <div className="lesson-launcher-footer">
          {!!view?.runs.length && (
            <button
              className="text-button"
              onClick={() => setHistoryOpen(true)}
            >
              Bài đang làm & kết quả <ArrowRight size={15} />
            </button>
          )}
          <button className="text-button" onClick={() => setDetailsOpen(true)}>
            Chi tiết bài học
            {pack.errors.length + pack.skipped.length > 0
              ? ` · ${pack.errors.length + pack.skipped.length} lưu ý`
              : ""}
          </button>
        </div>
      )}
      {detailsOpen && pack && (
        <Modal title="Chi tiết bài học" onClose={() => setDetailsOpen(false)}>
          <span className="badge">{titles[pack.status]}</span>
          <p>{pack.message}</p>
          <p>
            {pack.originalCount} câu gốc · {pack.verifiedOriginalCount} câu đã
            kiểm tra đáp án và gợi ý
          </p>
          {pack.errors.length > 0 && (
            <div className="notice">
              <strong>Phần cần kiểm tra</strong>
              {pack.errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}
          {pack.skipped.length > 0 && (
            <div className="notice">
              <strong>Câu chưa đủ điều kiện tạo lời giải</strong>
              {pack.skipped.map((q) => (
                <p key={q.sourceId}>
                  <b>
                    {view?.sources.find((s) => s.id === q.sourceId)?.label ||
                      q.sourceId}
                    :
                  </b>{" "}
                  {q.reason}
                </p>
              ))}
            </div>
          )}
        </Modal>
      )}
      {historyOpen && (
        <Modal
          title="Bài đang làm & kết quả"
          onClose={() => setHistoryOpen(false)}
        >
          <div className="saved-runs">
            {view?.runs.slice(0, 8).map((r) => (
              <Link key={r.id} href={`/luyen-tap/${doc.id}/${r.id}`}>
                <span>
                  {r.kind === "original"
                    ? "Đề gốc"
                    : r.kind === "similar"
                      ? "Bài tương tự"
                      : "Bộ luyện"}{" "}
                  · {r.solved}/{r.total} câu ·{" "}
                  {r.finished
                    ? `Kết quả ${r.score === null ? "tự đối chiếu" : `${r.score}/10`}`
                    : "Tiếp tục học"}
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </Modal>
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
  const [similarOpen, setSimilarOpen] = useState(false);
  const [difficulty, setDifficulty] =
    useState<SimilarDifficulty>("progressive");
  const [similarError, setSimilarError] = useState("");
  const [similarBusy, setSimilarBusy] = useState(false);
  const similarRequest = useRef<{ key: string; id: string } | null>(null);
  const busyRef = useRef(false);

  const [doc, setDoc] = useState<PublicDocument | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [entry, setEntry] = useState("");
  const [hint, setHint] = useState(false);
  const [video, setVideo] = useState(false);
  const [videoView, setVideoView] = useState<GuidanceView | null>(null);
  const [videoError, setVideoError] = useState("");
  const [videoStarting, setVideoStarting] = useState(false);
  const videoRequest = useRef(false);
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
  busyRef.current = busy;
  useEffect(() => {
    let active = true;
    setRun(null);
    current.current = null;
    setError("");
    setEntry("");
    setFeedback("");
    setSimilarOpen(false);
    setHint(false);
    setExplain(false);
    setVideo(false);
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
          setEntry(
            r.questions[r.index]
              ? r.attempts[r.questions[r.index].id]?.last || ""
              : "",
          );
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
  async function openVideo(questionId: string, retry = false) {
    if (videoRequest.current) return;
    videoRequest.current = true;
    setVideo(true);
    setVideoStarting(true);
    setVideoError("");
    setVideoView(null);
    setHint(false);
    hintVisible.current = false;
    setExplain(false);
    setBusy(true);
    try {
      const result = await startGuidance(endpoint, questionId, retry);
      if (result.run) {
        setRun(result.run);
        current.current = result.run;
      }
      setVideoView(result.guidance);
    } catch (e) {
      setVideoError((e as Error).message);
      // A configuration failure may precede the server's guide action. Close the hint timer.
      try {
        const latest = await request<RunView>(endpoint, {
          action: "close_hint",
          questionId,
          eventId: crypto.randomUUID(),
        });
        setRun(latest);
        current.current = latest;
      } catch {}
    } finally {
      videoRequest.current = false;
      setVideoStarting(false);
      setBusy(false);
    }
  }
  useEffect(() => {
    if (
      !run?.similar ||
      run.similar.status === "ready" ||
      run.similar.status === "failed"
    )
      return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        if (!busyRef.current) {
          const next = await request<RunView>(endpoint);
          if (
            active &&
            !busyRef.current &&
            (!current.current || next.updatedAt >= current.current.updatedAt)
          ) {
            current.current = next;
            setRun(next);
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
      if (active) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [endpoint, run?.similar?.status]);
  async function createFiveSimilar() {
    if (!run || similarBusy) return;
    const question = run.questions[run.index];
    if (!question) return;
    setSimilarBusy(true);
    setSimilarError("");
    const key = `${endpoint}:${question.id}:${difficulty}`;
    if (similarRequest.current?.key !== key)
      similarRequest.current = { key, id: crypto.randomUUID() };
    try {
      const next = await request<RunView>(`${endpoint}/similar`, {
        questionId: question.id,
        difficulty,
        requestId: similarRequest.current.id,
      });
      setSimilarOpen(false);
      similarRequest.current = null;
      router.push(`/luyen-tap/${documentId}/${next.id}`);
    } catch (e) {
      setSimilarError((e as Error).message);
    } finally {
      setSimilarBusy(false);
    }
  }
  async function retryFiveSimilar() {
    setBusy(true);
    setError("");
    try {
      const next = await request<RunView>(`${endpoint}/similar/retry`, {});
      current.current = next;
      setRun(next);
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
  if (!q)
    return (
      <section className="card empty-state" aria-live="polite">
        <Rocket size={32} />
        <h2>Chuẩn bị 5 câu tương tự cho em</h2>
        <p>{run.similar?.message || "Đang chuẩn bị câu đầu tiên…"}</p>
        <p>Em sẽ vào làm ngay khi câu đầu có đủ đáp án và gợi ý đã kiểm tra.</p>
        {error && <p role="alert">{error}</p>}
        {run.similar?.status === "failed" && (
          <button
            className="button"
            disabled={busy}
            onClick={() => void retryFiveSimilar()}
          >
            Thử lại phần chưa xong
          </button>
        )}
        <ButtonLink
          href={
            run.similar
              ? `/luyen-tap/${documentId}/${run.similar.sourceRunId}`
              : `/tai-lieu/${documentId}`
          }
          secondary
        >
          Về bài đang học
        </ButtonLink>
      </section>
    );
  const a = run.attempts[q.id] || emptyLearningAttempt();
  const preparingSimilar = !!run.similar && run.similar.status !== "ready";
  const waitingForNext =
    preparingSimilar && run.index === run.questions.length - 1;
  const targetCount = run.similar?.target || run.questions.length;
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
        <RewardCelebration runId={run.id} />
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
              {run.result.firstCorrect}/{run.result.gradable} câu đạt trọn điểm
              lần đầu · {run.result.total - run.result.gradable} câu chưa đủ căn
              cứ chấm
            </p>
            <p>
              {run.result.hints} lượt gợi ý ·{" "}
              {Math.round(run.result.hintMs / 1000)} giây xem gợi ý ·{" "}
              {run.result.independent} câu đúng độc lập
            </p>
            <p className="micro">
              Gợi ý không trừ điểm. Tự luận được ghi nhận điểm từng ý ở lần nộp
              đầu. Câu chưa đủ căn cứ chấm không nằm trong điểm /10.
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
              {item.grading === "ungraded" && (
                <p className="notice">{item.ungradableReason}</p>
              )}
              {run.attempts[item.id]?.assessment && (
                <div className="answer-assessment">
                  <p>{run.attempts[item.id].assessment!.feedback}</p>
                  {run.attempts[item.id].assessment!.parts.map((part) => (
                    <p key={part.id}>
                      {part.label}:{" "}
                      {part.status === "ungraded"
                        ? "Chưa chấm"
                        : `${part.points}/${part.maxPoints}`}{" "}
                      · {part.feedback}
                    </p>
                  ))}
                </div>
              )}
              {item.hasFigure && (
                <QuestionSourceImages
                  documentId={documentId}
                  document={doc}
                  question={item}
                />
              )}
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
          disabled={busy || preparingSimilar}
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
      {run.similar && (
        <div className="notice similar-progress" role="status">
          <div>
            <strong>{run.questions.length}/5 câu đã sẵn sàng</strong>
            <p>{run.similar.message}</p>
          </div>
          {run.similar.status === "failed" && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void retryFiveSimilar()}
            >
              Thử lại phần chưa xong
            </button>
          )}
          <Link href={`/luyen-tap/${documentId}/${run.similar.sourceRunId}`}>
            Về câu gốc
          </Link>
        </div>
      )}
      <div className="practice-progress">
        <div>
          <strong>
            Câu {run.index + 1}
            <span> / {targetCount}</span>
          </strong>
          <span>{run.result.solved} câu đã hoàn thành</span>
        </div>
        <div className="progress-track">
          <span
            style={{
              width: `${(run.result.solved / targetCount) * 100}%`,
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
          <h1 className="question-text">
            {q.prompt ||
              "Không đọc rõ câu hỏi. Em có thể xem trang gốc ngay bên dưới."}
          </h1>
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
          {!!q.warnings?.length && (
            <div className="notice">
              <strong>Lưu ý khi đọc đề</strong>
              <ul>
                {q.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          {q.grading === "ungraded" && (
            <p className="notice" role="status">
              {q.ungradableReason ||
                "Chưa có căn cứ chắc chắn để chấm đúng/sai."}{" "}
              Em vẫn có thể nhập và lưu bài làm. Câu này không tính vào điểm.
            </p>
          )}
          {q.hasFigure ? (
            <QuestionSourceImages
              key={q.id}
              documentId={documentId}
              document={doc}
              question={q}
            />
          ) : null}
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
                  next.attempts[q.id]?.assessment?.feedback ||
                    (next.attempts[q.id]?.solved
                      ? "Đúng rồi! Em đã tìm ra đáp án."
                      : "Chưa đúng rồi. Em thử lại nhé, hoặc mở một gợi ý nhỏ."),
                );
            }}
          >
            {q.grading === "choice" ||
            (q.grading === "ungraded" && q.inputKind === "multiple_choice") ? (
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
            ) : q.answerFields?.length ? (
              <fieldset
                className="written-answer-fields"
                disabled={busy || a.solved || a.guided}
              >
                <legend>Bài làm của em</legend>
                {q.answerFields.map((field) => {
                  let values: Record<string, string> = {};
                  try {
                    const parsed = JSON.parse(entry || "{}");
                    if (
                      parsed &&
                      typeof parsed === "object" &&
                      !Array.isArray(parsed)
                    )
                      values = parsed;
                  } catch {}
                  return (
                    <label className="field" key={field.id}>
                      {field.label}
                      <textarea
                        rows={2}
                        maxLength={Math.floor(11000 / q.answerFields!.length)}
                        value={
                          typeof values[field.id] === "string"
                            ? values[field.id]
                            : ""
                        }
                        onChange={(e) =>
                          setEntry(
                            JSON.stringify({
                              ...values,
                              [field.id]: e.target.value,
                            }),
                          )
                        }
                        placeholder="Nhập đáp án hoặc cách làm cho ý này"
                      />
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <label className="field numeric-answer">
                {q.grading === "exact"
                  ? "Đáp án của em"
                  : "Bài làm và cách giải của em"}
                <textarea
                  rows={q.grading === "exact" ? 2 : 5}
                  value={entry}
                  disabled={busy || a.solved || a.guided}
                  onChange={(e) => setEntry(e.target.value)}
                  maxLength={12000}
                  placeholder="Em nhập đáp án và các bước làm ở đây"
                />
              </label>
            )}
            <div
              className={`answer-feedback ${a.solved ? "success" : feedback && (!a.assessment || a.assessment.status === "graded") ? "retry" : ""}`}
              role="status"
            >
              {a.solved
                ? a.guided
                  ? "Mình đã cùng hoàn thành. Em thử một câu tương tự nhé!"
                  : "Đúng rồi! Em đã tìm ra đáp án."
                : feedback}
            </div>
            {a.assessment && (
              <div className="answer-assessment" aria-live="polite">
                <strong>
                  {a.assessment.status !== "ungraded"
                    ? `Điểm kết quả${a.assessment.status === "partial" ? " đã ghi nhận" : ""}: ${a.assessment.points}/${a.assessment.maxPoints}`
                    : "Đã lưu bài làm · Chưa chấm đúng/sai"}
                </strong>
                <p>{a.assessment.feedback}</p>
                {a.assessment.parts.map((part) => (
                  <p key={part.id}>
                    <b>
                      {part.label}:{" "}
                      {part.status === "ungraded"
                        ? "Chưa chấm"
                        : `${part.points}/${part.maxPoints}`}
                    </b>{" "}
                    · {part.feedback}
                  </p>
                ))}
              </div>
            )}
            <div
              className={`question-actions${a.solved ? " solved-question-actions" : ""}`}
            >
              {!a.solved && !a.guided ? (
                <>
                  {
                    <button
                      className="button"
                      disabled={busy || !entry.trim()}
                      type="submit"
                    >
                      {busy
                        ? "Đang kiểm tra…"
                        : q.grading === "ungraded"
                          ? "Lưu bài làm"
                          : q.grading === "self_review"
                            ? "Chấm từng ý"
                            : "Kiểm tra đáp án"}{" "}
                      <CheckCircle2 size={18} />
                    </button>
                  }
                  {q.grading !== "ungraded" && (
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
                  )}
                  {q.grading === "self_review" && a.tries > 0 && (
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
                      Xem hướng dẫn
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
                    <Lightbulb size={18} /> Giải thích
                  </button>
                </>
              )}
              <button
                type="button"
                className="button secondary"
                title="Tạo 5 câu mới cùng dạng với bài này"
                disabled={busy || q.grading === "ungraded"}
                onClick={() => {
                  setDifficulty("progressive");
                  setSimilarError("");
                  setSimilarOpen(true);
                }}
              >
                <Rocket size={18} /> Tạo thêm 5 câu
              </button>
              {a.solved && (
                <button
                  type="button"
                  className="button"
                  disabled={busy || waitingForNext}
                  onClick={() =>
                    run.index < run.questions.length - 1
                      ? navigate(run.index + 1)
                      : setFinish(true)
                  }
                >
                  {waitingForNext
                    ? "Đang chuẩn bị…"
                    : run.index < run.questions.length - 1
                      ? "Câu tiếp theo"
                      : "Xem kết quả"}{" "}
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </form>
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
                disabled={busy || waitingForNext}
                onClick={() =>
                  run.index < run.questions.length - 1
                    ? navigate(run.index + 1)
                    : setFinish(true)
                }
              >
                {waitingForNext
                  ? "Câu tiếp theo đang được chuẩn bị…"
                  : "Để sau, mình thử câu khác →"}
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
              Gợi ý giúp em hiểu bài hơn. Câu đã mở gợi ý sẽ không tính huy
              chương tự giải và nhận ít điểm thi đua hơn.
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
              {Array.from(
                { length: targetCount - run.questions.length },
                (_, i) => (
                  <button
                    key={`pending-${i}`}
                    disabled
                    aria-label={`Câu ${run.questions.length + i + 1} đang chuẩn bị`}
                  >
                    {run.questions.length + i + 1}
                  </button>
                ),
              )}
            </div>
            <small>Xanh: đã hoàn thành · Viền xanh: đang làm</small>
          </div>
        </aside>
      </div>
      {similarOpen && (
        <Modal
          title="Em muốn luyện ở mức nào?"
          onClose={() => {
            if (!similarBusy) setSimilarOpen(false);
          }}
        >
          <p>
            {q.answerFields && q.answerFields.length > 1
              ? `5 câu lớn mới, mỗi câu có ${q.answerFields.length} ý giống cấu trúc câu này.`
              : q.grading === "self_review"
                ? "5 bài tự luận mới cùng dạng với bài này, có đáp án và gợi ý riêng."
                : "5 bài mới cùng dạng với câu em đang học, có đáp án và gợi ý riêng."}
          </p>
          <fieldset className="similar-difficulty" disabled={similarBusy}>
            <legend>Chọn độ khó · Mặc định tăng dần</legend>
            {similarDifficulties.map((option) => (
              <label
                key={option.value}
                className={difficulty === option.value ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="similar-difficulty"
                  value={option.value}
                  checked={difficulty === option.value}
                  onChange={() => setDifficulty(option.value)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="micro">
            Câu đầu sẵn sàng là em có thể làm ngay. Các câu sau tiếp tục được
            chuẩn bị.
          </p>
          {similarError && (
            <p className="notice error" role="alert">
              {similarError}
            </p>
          )}
          <button
            className="button full"
            disabled={similarBusy}
            onClick={() => void createFiveSimilar()}
          >
            {similarBusy ? "Đang mở bộ luyện…" : "Bắt đầu luyện 5 câu"}{" "}
            <ArrowRight size={18} />
          </button>
        </Modal>
      )}
      {hint && (
        <Modal
          title="Một gợi ý nhỏ cho em"
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
            <HintHelpActions
              disabled={busy}
              onVideo={() => void openVideo(q.id)}
              onGuide={() =>
                act({ action: "guide", questionId: q.id }, () => {
                  setHint(false);
                  hintVisible.current = false;
                  setExplain(true);
                })
              }
            />
          </div>
        </Modal>
      )}
      {video && (
        <GuidanceDialog
          endpoint={endpoint}
          initial={videoView}
          initialError={videoError}
          starting={videoStarting || busy}
          onUnderstood={
            a.guided && !a.solved
              ? () =>
                  void act({ action: "understood", questionId: q.id }, () =>
                    setVideo(false),
                  )
              : undefined
          }
          onRetry={() => void openVideo(q.id, true)}
          onClose={() => setVideo(false)}
          onReadSolution={() => {
            setVideo(false);
            if (q.solution) setExplain(true);
            else
              void act({ action: "guide", questionId: q.id }, () =>
                setExplain(true),
              );
          }}
        />
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
          <button
            type="button"
            className="button secondary guidance-from-solution"
            disabled={busy}
            onClick={() => void openVideo(q.id)}
          >
            Xem video hướng dẫn
          </button>
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
              Xem kết quả
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
          <p>Chọn một tài liệu đã sẵn sàng để bắt đầu làm bài nhé.</p>
          <ButtonLink href="/thu-vien">Đến thư viện</ButtonLink>
        </div>
      )}
    </section>
  );
}
