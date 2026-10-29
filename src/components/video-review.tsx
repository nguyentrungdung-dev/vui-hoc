"use client";
import { useState } from "react";
import type { GuidanceView } from "@/lib/guidance";
import { GuidancePlayer } from "./guidance-player";
export function VideoReview({
  cases,
  total,
}: {
  cases: {
    id: string;
    topic: string;
    seconds: number;
    guidance: GuidanceView;
  }[];
  total: number;
}) {
  const [selected, setSelected] = useState(cases[0]?.id);
  const current = cases.find((c) => c.id === selected);
  return (
    <main className="video-review">
      <header>
        <p className="eyebrow">Vui Học · Xem kết quả thực tế</p>
        <h1>Video lời giải mới</h1>
        <p>Cùng một luồng tạo video cho nhiều dạng bài · Giọng đọc Aoede</p>
        <p>
          {cases.length}/{total} bài đã sẵn sàng
        </p>
      </header>
      <div className="video-review-grid">
        <nav aria-label="Chọn bài xem thử">
          {cases.map((c) => (
            <button
              key={c.id}
              className={c.id === selected ? "active" : ""}
              aria-pressed={c.id === selected}
              onClick={() => setSelected(c.id)}
            >
              <strong>{c.topic}</strong>
              <span>{Math.round(c.guidance.motion?.duration ?? 0)} giây</span>
            </button>
          ))}
        </nav>
        {current ? (
          <section>
            <h2>{current.topic}</h2>
            <p>{current.guidance.prompt}</p>
            <GuidancePlayer key={current.guidance.id} view={current.guidance} />
          </section>
        ) : (
          <p>Chưa có video sẵn sàng.</p>
        )}
      </div>
    </main>
  );
}
