"use client";

import { useState } from "react";
import { Play } from "lucide-react";

export function HintHelpActions({
  disabled = false,
  onGuide,
  onVideo,
}: {
  disabled?: boolean;
  onGuide: () => void;
  onVideo?: () => void;
}) {
  const [videoNotice, setVideoNotice] = useState(false);

  return (
    <>
      <div className="hint-help-actions">
        <button
          type="button"
          className="button secondary guide-button"
          disabled={disabled}
          onClick={onGuide}
        >
          Làm từng bước
        </button>
        <button
          type="button"
          className="button secondary hint-video-button"
          disabled={disabled}
          onClick={onVideo || (() => setVideoNotice(true))}
        >
          <Play size={18} aria-hidden="true" />
          <span>Xem video</span>
        </button>
      </div>
      {videoNotice && (
        <div className="notice hint-video-notice" role="status">
          Video hướng dẫn đang được chuẩn bị. Em có thể chọn “Làm từng bước” để
          xem lời giải chi tiết nhé!
        </div>
      )}
    </>
  );
}
