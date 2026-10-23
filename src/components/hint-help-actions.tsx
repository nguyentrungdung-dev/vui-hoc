"use client";

import { useState } from "react";
import { Play } from "lucide-react";

export function HintHelpActions({
  disabled = false,
  onGuide,
}: {
  disabled?: boolean;
  onGuide: () => void;
}) {
  const [videoNotice, setVideoNotice] = useState(false);

  return (
    <>
      <div className="hint-help-actions">
        <button
          type="button"
          className="text-button guide-button"
          disabled={disabled}
          onClick={onGuide}
        >
          Con vẫn chưa hiểu — Cùng làm từng bước
        </button>
        <button
          type="button"
          className="button secondary hint-video-button"
          disabled={disabled}
          onClick={() => setVideoNotice(true)}
        >
          <Play size={18} aria-hidden="true" />
          <span>Xem video hướng dẫn chi tiết</span>
        </button>
      </div>
      {videoNotice && (
        <div className="notice hint-video-notice" role="status">
          Video hướng dẫn đang được chuẩn bị. Em có thể chọn “Cùng làm từng
          bước” để xem lời giải chi tiết nhé!
        </div>
      )}
    </>
  );
}
