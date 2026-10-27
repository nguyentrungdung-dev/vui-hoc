"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  tileFrame,
  type GuidanceResponse,
  type GuidanceView,
} from "@/lib/guidance";
import { GuidanceMotionStage } from "./guidance-motion-stage";
import { Modal } from "./ui";

async function readResponse(response: Response): Promise<GuidanceResponse> {
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(body?.error || "Chưa tải được hướng dẫn. Em hãy thử lại.");
  return body;
}
export async function startGuidance(
  endpoint: string,
  questionId: string,
  retry = false,
) {
  return readResponse(
    await fetch(`/api/documents${endpoint}/guidance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, retry }),
    }),
  );
}
export function GuidanceDialog({
  endpoint,
  initial,
  initialError,
  starting,
  onRetry,
  onClose,
  onReadSolution,
  onUnderstood,
}: {
  endpoint: string;
  initial: GuidanceView | null;
  initialError: string;
  starting: boolean;
  onRetry: () => void;
  onClose: () => void;
  onReadSolution: () => void;
  onUnderstood?: () => void;
}) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState(initialError);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    setView(initial);
    setError(initialError);
  }, [initial, initialError]);
  const id = view?.id;
  const status = view?.status;
  useEffect(() => {
    if (!id || status === "ready" || status === "failed") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    let failures = 0;
    async function poll() {
      try {
        const result = await readResponse(
          await fetch(`/api/documents${endpoint}/guidance/${id}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        );
        if (!active) return;
        setView(result.guidance);
        setError("");
        failures = 0;
        if (["queued", "generating"].includes(result.guidance.status))
          timer = setTimeout(poll, 2500);
      } catch (e) {
        if (!active) return;
        failures++;
        setError((e as Error).message);
        if (failures < 4) timer = setTimeout(poll, 4000);
      }
    }
    timer = setTimeout(poll, 1000);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [endpoint, id, status, refresh]);
  const failed = view?.status === "failed";
  return (
    <Modal title="Cùng xem cách giải nhé!" onClose={onClose}>
      {view?.status === "ready" ? (
        <GuidancePlayer key={view.id} view={view} />
      ) : (
        <div className="guidance-loading">
          {!failed && !error && (
            <LoaderCircle className="spin" size={32} aria-hidden="true" />
          )}
          <p role="status">
            {starting
              ? "Đang mở hướng dẫn…"
              : error || view?.message || "Đang chuẩn bị hướng dẫn…"}
          </p>
          {view && !failed && !error && (
            <progress
              value={view.completed}
              max={view.total + 1}
              aria-label="Tiến độ tạo giọng đọc"
            />
          )}
          {view && (
            <small>
              Đã chuẩn bị {view.completed}/{view.total} đoạn giọng đọc
            </small>
          )}
          {(failed || error) && (
            <button
              type="button"
              className="button"
              disabled={starting}
              onClick={() => {
                if (failed || !view) onRetry();
                else {
                  setError("");
                  setRefresh((n) => n + 1);
                }
              }}
            >
              Thử lại
            </button>
          )}
        </div>
      )}
      {view?.status === "ready" && onUnderstood && (
        <button
          type="button"
          className="button full guidance-understood"
          disabled={starting}
          onClick={onUnderstood}
        >
          Mình đã hiểu các bước
        </button>
      )}
      <button
        type="button"
        className="text-button guidance-read"
        disabled={starting}
        onClick={onReadSolution}
      >
        Xem lời giải từng bước bằng chữ
      </button>
    </Modal>
  );
}

export function GuidancePlayer({ view }: { view: GuidanceView }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const playAttempt = useRef(0);
  const pendingSeek = useRef<number | null>(null);
  const segment = view.segments[index];
  const count = view.segments.length;
  const motionTime = view.motion
    ? view.motion.clips[index].start +
      progress * (duration || view.motion.clips[index].seconds)
    : 0;
  const [completed, setCompleted] = useState(false);
  // The audio clock is the sole timeline for scenes, including pause and seeking.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0)
        setProgress(audio.currentTime / audio.duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, index]);
  useEffect(
    () => () => {
      playAttempt.current++;
      audioRef.current?.pause();
    },
    [],
  );
  async function play() {
    const audio = audioRef.current;
    if (!audio) return;
    const attempt = ++playAttempt.current;
    setError("");
    try {
      await audio.play();
      if (attempt !== playAttempt.current) return;
      setPlaying(true);
      setAutoPlay(true);
      setCompleted(false);
    } catch (e) {
      if (
        attempt !== playAttempt.current ||
        (e as DOMException).name === "AbortError"
      )
        return;
      setPlaying(false);
      setAutoPlay(false);
      setError(
        (e as DOMException).name === "NotAllowedError"
          ? "Em nhấn Phát để bắt đầu nghe nhé."
          : "Chưa phát được giọng đọc. Em thử nhấn Phát lại nhé.",
      );
    }
  }
  function pause() {
    playAttempt.current++;
    audioRef.current?.pause();
    setPlaying(false);
    setAutoPlay(false);
  }
  function go(next: number, shouldPlay = playing) {
    pause();
    pendingSeek.current = null;
    setIndex(next);
    setProgress(0);
    setDuration(0);
    setError("");
    setCompleted(false);
    setAutoPlay(shouldPlay);
  }
  function replay() {
    if (index !== 0) {
      go(0, true);
      return;
    }
    const audio = audioRef.current;
    if (audio) audio.currentTime = 0;
    setProgress(0);
    void play();
  }
  const clock = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  return (
    <div className="guidance-player">
      <div className="guidance-step-heading">
        <span className="badge">
          Phần {index + 1}/{count}
        </span>
        <span>Nhìn kỹ · Nghe chậm · Cùng hiểu</span>
      </div>
      {view.motion ? (
        <GuidanceMotionStage motion={view.motion} time={motionTime} />
      ) : (
        <div className="guidance-stage" aria-hidden="true">
          {segment.scene?.tiles.map((tile, i) => {
            const frame = tileFrame(tile, progress);
            return (
              <div
                key={`${index}-${i}`}
                className={`motion-tile${frame.highlighted ? " highlighted" : ""}`}
                style={{
                  left: `${4 + frame.x * 32}%`,
                  top: `${6 + frame.y * 47}%`,
                  opacity: frame.visible ? 1 : 0,
                  transform: frame.visible ? "scale(1)" : "scale(.9)",
                }}
              >
                {tile.text}
              </div>
            );
          })}
          {!playing && progress === 0 && (
            <button
              type="button"
              className="guidance-stage-play"
              tabIndex={-1}
              onClick={() => void play()}
            >
              <Play size={26} />
            </button>
          )}
        </div>
      )}
      <p className="guidance-caption" aria-live="polite">
        {segment.text}
      </p>
      <audio
        key={`${view.id}-${index}`}
        ref={audioRef}
        src={segment.audioUrl || undefined}
        preload="auto"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(Number.isFinite(d) ? d : 0);
          if (pendingSeek.current !== null && Number.isFinite(d) && d > 0) {
            const seek = Math.min(d, pendingSeek.current);
            e.currentTarget.currentTime = seek;
            setProgress(seek / d);
            pendingSeek.current = null;
          }
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onCanPlay={() => {
          if (autoPlay) void play();
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (Number.isFinite(a.duration) && a.duration > 0) {
            setDuration(a.duration);
            setProgress(a.currentTime / a.duration);
          }
        }}
        onEnded={() => {
          if (index < count - 1) go(index + 1, true);
          else {
            setProgress(1);
            setPlaying(false);
            setAutoPlay(false);
            setCompleted(true);
          }
        }}
        onError={() => {
          setPlaying(false);
          setAutoPlay(false);
          setError(
            "Chưa tải được âm thanh. Em hãy đóng và mở lại hướng dẫn để thử lại.",
          );
        }}
      />
      <div className="guidance-seek">
        <span>{clock(view.motion ? motionTime : progress * duration)}</span>
        <input
          type="range"
          min="0"
          max="1000"
          value={Math.round(
            (view.motion ? motionTime / view.motion.duration : progress) * 1000,
          )}
          disabled={!duration}
          aria-label="Tua đoạn hướng dẫn"
          onChange={(e) => {
            const next = Number(e.target.value) / 1000;
            if (view.motion) {
              const time = next * view.motion.duration;
              const target = view.motion.clips.findIndex(
                (c, i) => time < c.end || i === count - 1,
              );
              const localTime = time - view.motion.clips[target].start;
              if (target !== index) {
                go(target, playing);
                pendingSeek.current = localTime;
                setProgress(localTime / view.motion.clips[target].seconds);
              } else if (audioRef.current) {
                audioRef.current.currentTime = localTime;
                setProgress(
                  localTime / (duration || view.motion.clips[target].seconds),
                );
              }
              setCompleted(false);
              return;
            }
            if (audioRef.current && duration)
              audioRef.current.currentTime = next * duration;
            setProgress(next);
            setCompleted(false);
          }}
        />
        <span>{clock(view.motion?.duration ?? duration)}</span>
      </div>
      <div className="guidance-controls">
        <button
          type="button"
          className="icon-button"
          aria-label="Phát lại từ đầu"
          onClick={replay}
        >
          <RotateCcw size={20} />
        </button>
        <button
          type="button"
          className="button"
          onClick={() => (playing ? pause() : void play())}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
          {playing ? "Tạm dừng" : "Phát"}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Bước trước"
          disabled={index === 0}
          onClick={() => go(index - 1)}
        >
          <ChevronLeft size={23} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Bước tiếp theo"
          disabled={index === count - 1}
          onClick={() => go(index + 1)}
        >
          <ChevronRight size={23} />
        </button>
      </div>
      {error && (
        <p role="alert" className="guidance-player-message">
          {error}
        </p>
      )}
      {completed && (
        <p role="status" className="guidance-player-message">
          Mình đã xem hết các bước. Em có thể nghe lại phần cần xem nhé!
        </p>
      )}
      <div className="guidance-chapters" aria-label="Các bước hướng dẫn">
        {view.segments.map((_, i) => (
          <button
            type="button"
            key={i}
            className={index === i ? "active" : ""}
            aria-label={`Xem phần ${i + 1}`}
            aria-current={index === i ? "step" : undefined}
            onClick={() => go(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
