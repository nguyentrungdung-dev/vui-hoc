"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Captions,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { chapters } from "@/lib/demo";
import type { Shared } from "./app";
import { Character, PageTitle } from "./ui";

export function LecturePage({ state, startRun }: Shared) {
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captions, setCaptions] = useState(true);
  const [answer, setAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const current = chapters[chapter];
  useEffect(() => {
    if (!playing || chapter === 2) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [playing, chapter]);
  useEffect(() => {
    if (elapsed < 8) return;
    if (chapter < 3) {
      setChapter((c) => c + 1);
      setElapsed(0);
    } else setPlaying(false);
  }, [elapsed, chapter]);
  useEffect(() => {
    if (chapter === 2) setPlaying(false);
  }, [chapter]);
  function go(n: number) {
    setChapter(n);
    setElapsed(0);
    setPlaying(false);
    setFeedback("");
  }
  return (
    <>
      <Link className="back-link" href="/buoi-hoc">
        <ArrowLeft size={16} /> Menu buổi học
      </Link>
      <PageTitle
        eyebrow="CÙNG NHÌN · CÙNG HIỂU · CÙNG THỬ"
        title="Cộng thật khéo cùng em"
      >
        Bài giảng mẫu: phép cộng trong phạm vi 100.
      </PageTitle>
      <div className="lecture-layout">
        <section>
          <div className="slide-player">
            <div className="slide-top">
              <span>✦ Vui học · Lớp 2</span>
              <span>Trang {chapter + 1}/4 · Slide minh họa</span>
            </div>
            <div className="slide-stage">
              <span className="eyebrow">{current.subtitle}</span>
              <h2>{current.title}</h2>
              {chapter === 0 && (
                <div className="star-groups">
                  <div>
                    {Array.from({ length: 24 }, (_, i) => (
                      <span key={i}>✦</span>
                    ))}
                    <b>24 ngôi sao</b>
                  </div>
                  <span>＋</span>
                  <div>
                    {Array.from({ length: 13 }, (_, i) => (
                      <span key={i}>✦</span>
                    ))}
                    <b>13 ngôi sao</b>
                  </div>
                </div>
              )}
              <div className="equation">
                <span>{current.left}</span>
                <b>+</b>
                <span>{current.right}</span>
                <b>=</b>
                <strong>{current.result}</strong>
              </div>
              <Character
                index={state.profile.character}
                className="slide-character"
              />
              {chapter === 2 && (
                <div className="interaction">
                  <strong>Đến lượt em! 24 + 13 = ?</strong>
                  <div className="interaction-answers">
                    {[27, 37, 47].map((n) => (
                      <button
                        className={`button ${answer === n ? "" : "secondary"}`}
                        key={n}
                        onClick={() => {
                          setAnswer(n);
                          setFeedback(
                            n === 37
                              ? "Đúng rồi! 2 chục + 1 chục = 3 chục; 4 + 3 = 7."
                              : "Thử tách 24 thành 20 + 4 và 13 thành 10 + 3 nhé.",
                          );
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p role="status">
                    {feedback || "Chọn một đáp án để tiếp tục."}
                  </p>
                  {answer === 37 && (
                    <button className="text-button" onClick={() => go(3)}>
                      Tiếp tục bài giảng <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {captions && (
              <div className="slide-captions">{current.narration}</div>
            )}
            <div className="player-progress">
              <span
                style={{
                  width: `${((chapter + Math.min(elapsed, 8) / 8) / 4) * 100}%`,
                }}
              />
            </div>
            <div className="player-controls">
              <button
                aria-label={
                  playing ? "Tạm dừng trình chiếu" : "Phát trình chiếu"
                }
                className="icon-button"
                disabled={chapter === 2}
                onClick={() => {
                  if (chapter === 3 && elapsed >= 8) {
                    go(0);
                  }
                  setPlaying((p) => !p);
                }}
              >
                {playing ? <Pause size={21} /> : <Play size={21} />}
              </button>
              <button
                className="icon-button"
                aria-label="Xem lại từ đầu"
                onClick={() => {
                  go(0);
                  setAnswer(null);
                }}
              >
                <RotateCcw size={19} />
              </button>
              <span>
                {chapter === 2
                  ? "Đang dừng để em trả lời"
                  : "Trình chiếu mẫu · Không phải video AI"}
              </span>
              <button
                className={`icon-button ${captions ? "active" : ""}`}
                aria-label={captions ? "Ẩn lời giảng" : "Hiện lời giảng"}
                aria-pressed={captions}
                onClick={() => setCaptions(!captions)}
              >
                <Captions size={21} />
              </button>
            </div>
          </div>
          <div className="notice video-notice">
            <Lightbulb size={22} />
            <div>
              <strong>Trình chiếu mẫu để khám phá</strong>
              <p>
                Đây là slide tương tác bằng dữ liệu mẫu, chưa có giọng đọc. Với
                bài đang học, mở lời giải rồi chọn video hướng dẫn để nghe giọng
                đọc và xem minh họa riêng cho bài đó.
              </p>
              <Link href="/thu-vien" className="text-button">
                Chọn bài trong thư viện
              </Link>
            </div>
          </div>
          <div className="lecture-actions">
            <button
              className="button secondary"
              disabled={chapter === 0}
              onClick={() => go(chapter - 1)}
            >
              <ChevronLeft size={18} /> Phần trước
            </button>
            <button
              className="button"
              disabled={chapter === 2 && answer !== 37}
              onClick={() =>
                chapter < 3 ? go(chapter + 1) : startRun("similar", ["add"])
              }
            >
              {chapter === 3 ? "Luyện 5 câu tương tự" : "Phần tiếp theo"}
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
        <aside className="card chapter-menu">
          <span className="eyebrow">TỪNG CHÚT MỘT, EM NHÉ</span>
          <h3>Nội dung bài giảng</h3>
          {chapters.map((c, i) => (
            <button
              key={c.title}
              className={i === chapter ? "active" : ""}
              onClick={() => go(i)}
            >
              <span>{i < chapter ? <CheckCircle2 size={18} /> : i + 1}</span>
              <div>
                <strong>{c.title}</strong>
                <small>
                  {i === 2 ? "Có câu hỏi tương tác" : "Slide minh họa"}
                </small>
              </div>
              {i === chapter && <Play size={15} />}
            </button>
          ))}
          <div className="chapter-note">
            Em có thể chọn xem lại bất kỳ phần nào. Không cần vội đâu!
          </div>
        </aside>
      </div>
    </>
  );
}
