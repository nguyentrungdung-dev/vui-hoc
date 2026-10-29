"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Rocket,
  Volume2,
} from "./icons";
import { newAttempt, recordAnswer, summarize, topics } from "@/lib/demo";
import type { Shared } from "./app";
import { ButtonLink, Character, Modal, PageTitle } from "./ui";
import { HintHelpActions } from "./hint-help-actions";

export function PracticePage({ state, setState, startRun }: Shared) {
  const router = useRouter();
  const run = state.run;
  const [selected, setSelected] = useState<number | null>(null);
  const [entry, setEntry] = useState("");
  const [inputMode, setInputMode] = useState(false);
  const [hint, setHint] = useState(false);
  const hintStarted = useRef(0);
  const [explain, setExplain] = useState(false);
  const [finish, setFinish] = useState(false);
  const [translation, setTranslation] = useState(false);
  const [feedback, setFeedback] = useState("");
  if (!run)
    return (
      <div className="card empty-state">
        <Character index={state.profile.character} />
        <PageTitle
          eyebrow="MỘT NHIỆM VỤ NHỎ ĐANG CHỜ"
          title="Mình cùng thử sức nhé!"
        >
          Bắt đầu một bộ luyện mẫu hoặc tải bài của em để thử luồng tạo buổi
          học.
        </PageTitle>
        <div className="actions centered">
          <button className="button" onClick={() => startRun()}>
            Bắt đầu {state.lesson.count} câu mẫu <Rocket size={18} />
          </button>
          <ButtonLink href="/tai-len" secondary>
            Gửi bài của em
          </ButtonLink>
        </div>
      </div>
    );
  if (run.finished)
    return (
      <div className="card empty-state">
        <CheckCircle2 size={54} />
        <PageTitle
          eyebrow="NHIỆM VỤ ĐÃ HOÀN THÀNH"
          title="Em đã làm xong bộ câu này!"
        >
          Cùng xem lại kết quả hoặc khám phá một nhiệm vụ mới.
        </PageTitle>
        <div className="actions centered">
          <ButtonLink href="/ket-qua">Xem kết quả</ButtonLink>
          <button className="button secondary" onClick={() => startRun()}>
            Bắt đầu bộ mới
          </button>
        </div>
      </div>
    );
  const q = run.questions[run.index];
  const attempt = run.attempts[q.id] ?? newAttempt();
  const topic = topics.find((t) => t.id === q.topic)!;
  const completed = run.questions.filter(
    (x) => run.attempts[x.id]?.solved,
  ).length;
  function updateAttempt(change: Partial<typeof attempt>) {
    setState((s) =>
      s.run
        ? {
            ...s,
            run: {
              ...s.run,
              attempts: {
                ...s.run.attempts,
                [q.id]: {
                  ...(s.run.attempts[q.id] ?? newAttempt()),
                  ...change,
                },
              },
            },
          }
        : s,
    );
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const answer = inputMode
      ? entry.trim() === ""
        ? null
        : Number(entry)
      : selected;
    if (answer === null || !Number.isFinite(answer)) return;
    const correct = answer === q.answer;
    updateAttempt(recordAnswer(attempt, answer, q.answer));
    setFeedback(
      correct
        ? "Đúng rồi! Em đã tìm ra đáp án."
        : "Chưa đúng rồi. Em thử lại nhé, hoặc mở một gợi ý nhỏ.",
    );
  }
  function openHint() {
    hintStarted.current = Date.now();
    updateAttempt({ hintOpens: attempt.hintOpens + 1 });
    setHint(true);
  }
  function closeHint() {
    updateAttempt({
      hintMs: attempt.hintMs + Date.now() - hintStarted.current,
    });
    setHint(false);
  }
  function go(index: number) {
    setState((s) => (s.run ? { ...s, run: { ...s.run, index } } : s));
    setSelected(null);
    setEntry("");
    setFeedback("");
    setTranslation(false);
  }
  function endRun() {
    const finished = { ...run!, finished: true };
    const result = summarize(finished, state.lesson.name);
    setState((s) => ({
      ...s,
      run: finished,
      history: s.history.some((h) => h.id === result.id)
        ? s.history
        : [...s.history, result],
    }));
    setFinish(false);
    router.push("/ket-qua");
  }
  return (
    <>
      <div className="practice-top">
        <ButtonLink href="/buoi-hoc" secondary>
          <ArrowLeft size={16} /> Lưu và về menu
        </ButtonLink>
        <span className="badge">
          {run.kind === "original"
            ? "Đề TIMO gốc minh họa"
            : run.kind === "similar"
              ? "Bài tương tự · Dữ liệu mẫu"
              : "Bộ luyện · Dữ liệu mẫu"}
        </span>
        <button className="text-button" onClick={() => setFinish(true)}>
          Kết thúc bài
        </button>
      </div>
      <div className="practice-progress">
        <div>
          <strong>
            Câu {run.index + 1}
            <span> / {run.questions.length}</span>
          </strong>
          <span>{completed} câu đã hoàn thành</span>
        </div>
        <div className="progress-track">
          <span
            style={{ width: `${(completed / run.questions.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="quiz-layout">
        <section className="card question-card">
          <div className="card-top">
            <span className={`badge ${topic.color}`}>{topic.name}</span>
            <span className="micro">
              {q.advanced ? "Thử thách nâng cao" : "Củng cố kiến thức"}
            </span>
          </div>
          {state.lesson.mode === "timo" && (
            <>
              <p className="english-question" lang="en">
                {q.english}
              </p>
              <button
                className="text-button"
                onClick={() => setTranslation(!translation)}
              >
                {translation ? "Ẩn bản dịch" : "Xem bản dịch tiếng Việt"}
              </button>
            </>
          )}
          {(state.lesson.mode !== "timo" || translation) && (
            <h1 className="question-text">{q.text}</h1>
          )}
          {q.shape && (
            <svg
              viewBox="0 0 240 130"
              className="triangle"
              role="img"
              aria-label="Hình tam giác có ba cạnh"
            >
              <path
                d="M120 12 L222 115 L18 115 Z"
                fill="#eae5ff"
                stroke="#8b7ac7"
                strokeWidth="5"
                strokeLinejoin="round"
              />
              <circle cx="120" cy="12" r="6" fill="#8b7ac7" />
              <circle cx="222" cy="115" r="6" fill="#8b7ac7" />
              <circle cx="18" cy="115" r="6" fill="#8b7ac7" />
            </svg>
          )}
          <form onSubmit={submit}>
            <div className="answer-mode">
              <button
                type="button"
                className={!inputMode ? "active" : ""}
                onClick={() => setInputMode(false)}
              >
                Chọn đáp án
              </button>
              <button
                type="button"
                className={inputMode ? "active" : ""}
                onClick={() => setInputMode(true)}
              >
                Điền số
              </button>
            </div>
            {inputMode ? (
              <label className="field numeric-answer">
                Đáp án của em
                <input
                  type="number"
                  inputMode="numeric"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  disabled={attempt.solved}
                  placeholder="Nhập số ở đây"
                />
                <span>{q.unit}</span>
              </label>
            ) : (
              <div className="answer-grid">
                {q.options.map((option, i) => (
                  <button
                    key={option}
                    type="button"
                    disabled={attempt.solved}
                    className={`answer ${selected === option ? "selected" : ""} ${attempt.solved && option === q.answer ? "correct" : ""}`}
                    onClick={() => {
                      setSelected(option);
                      setFeedback("");
                    }}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    <strong>{option}</strong>
                    {attempt.solved && option === q.answer && (
                      <CheckCircle2 size={22} />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="answer-feedback" role="status">
              {attempt.solved ? (
                <span className="success">
                  <CheckCircle2 size={19} />{" "}
                  {attempt.guided
                    ? "Mình đã cùng hoàn thành. Em thử một câu mới để tự làm nhé!"
                    : "Đúng rồi! Em đã tìm ra đáp án."}
                </span>
              ) : (
                feedback
              )}
            </div>
            <div className="question-actions">
              {!attempt.solved ? (
                <>
                  <button
                    className="button"
                    type="submit"
                    disabled={
                      inputMode ? entry.trim() === "" : selected === null
                    }
                  >
                    Kiểm tra đáp án <CheckCircle2 size={18} />
                  </button>
                  <button
                    className="hint-button"
                    type="button"
                    onClick={openHint}
                  >
                    <Lightbulb size={20} /> Gợi ý nhỏ
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => setExplain(true)}
                  >
                    <Lightbulb size={18} /> Giải thích
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() =>
                      run.index < run.questions.length - 1
                        ? go(run.index + 1)
                        : setFinish(true)
                    }
                  >
                    {run.index < run.questions.length - 1
                      ? "Câu tiếp theo"
                      : "Xem kết quả"}
                    <ArrowRight size={18} />
                  </button>
                </>
              )}
            </div>
          </form>
          <div className="question-bottom">
            <button
              className="text-button"
              disabled={run.index === 0}
              onClick={() => go(run.index - 1)}
            >
              ← Câu trước
            </button>
            {!attempt.solved && (
              <button
                className="text-button"
                onClick={() =>
                  run.index < run.questions.length - 1
                    ? go(run.index + 1)
                    : setFinish(true)
                }
              >
                Để sau, mình thử câu khác →
              </button>
            )}
          </div>
        </section>
        <aside className="quiz-aside">
          <div className="card buddy-card">
            <Character index={state.profile.character} />
            <h3>Cứ bình tĩnh, em nhé!</h3>
            <p>
              Mở gợi ý không bị trừ điểm. Mỗi lần thử là một lần mình hiểu hơn.
            </p>
            <span className="badge">
              {attempt.hintOpens === 0
                ? "Chưa dùng gợi ý"
                : `${attempt.hintOpens} lượt mở gợi ý`}
            </span>
          </div>
          <div className="card question-map">
            <h3>Bản đồ câu hỏi</h3>
            <div>
              {run.questions.map((x, i) => (
                <button
                  key={x.id}
                  aria-label={`Đến câu ${i + 1}${run.attempts[x.id]?.solved ? ", đã hoàn thành" : ""}`}
                  aria-current={i === run.index ? "step" : undefined}
                  className={`${i === run.index ? "current" : ""} ${run.attempts[x.id]?.solved ? "solved" : ""}`}
                  onClick={() => go(i)}
                >
                  {run.attempts[x.id]?.solved ? (
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
        <Modal title="Một gợi ý nhỏ cho em" onClose={closeHint}>
          <div className="hint-content">
            <span className="badge">
              Gợi ý {Math.min(attempt.hintOpens, 3)} / 3
            </span>
            <p>
              {attempt.hintOpens <= 1
                ? q.hint
                : attempt.hintOpens === 2
                  ? q.steps[0]
                  : q.steps.slice(0, -1).join(" ")}
            </p>
            <button className="button full" onClick={closeHint}>
              Em thử tự làm lại nhé <ArrowRight size={17} />
            </button>
            <HintHelpActions
              onGuide={() => {
                updateAttempt({
                  guided: true,
                  hintMs: attempt.hintMs + Date.now() - hintStarted.current,
                });
                setHint(false);
                setExplain(true);
              }}
            />
          </div>
        </Modal>
      )}
      {explain && (
        <Modal
          title={attempt.guided ? "Cùng làm từng bước" : "Vì sao đáp án đúng?"}
          onClose={() => setExplain(false)}
        >
          <ol className="solution-steps">
            {q.steps.map((step, i) => (
              <li key={step}>
                <b>{i + 1}</b>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {state.lesson.mode === "timo" && (
            <div className="english-solution" lang="en">
              <strong>English explanation</strong>
              <p>
                {q.topic === "shape" && !q.advanced
                  ? "A triangle has three sides. Count each side once."
                  : q.topic === "logic"
                    ? "Look at the difference between neighboring numbers. Continue the same pattern."
                    : q.topic === "story"
                      ? "Add the marbles Lan receives. Subtract the marbles she gives away, if any."
                      : "Split the numbers into tens and ones, then combine the results."}{" "}
                The answer is {q.answer}.
              </p>
            </div>
          )}
          {attempt.guided && !attempt.solved ? (
            <button
              className="button full"
              onClick={() => {
                updateAttempt({ solved: true });
                setExplain(false);
              }}
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
            Em đã hoàn thành {completed}/{run.questions.length} câu. Câu chưa
            trả lời hoặc bỏ qua được tính là chưa đúng trong điểm lần đầu.
          </p>
          <p>
            Điểm /10 và mức dùng gợi ý được ghi riêng. Em có thể quay lại làm
            tiếp trước khi kết thúc.
          </p>
          <div className="actions">
            <button
              className="button secondary"
              onClick={() => setFinish(false)}
            >
              Làm tiếp
            </button>
            <button className="button" onClick={endRun}>
              Xem kết quả
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
