"use client";
import { useState } from "react";
import type { PublicDocument } from "@/lib/documents";
import type { QuestionView } from "@/lib/learning";

export function QuestionSourceImages({
  documentId,
  document,
  question,
}: {
  documentId: string;
  document: PublicDocument | null;
  question: QuestionView;
}) {
  const [retry, setRetry] = useState(0);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const regions = question.figureRegions || [];
  function url(page: number, crop: (typeof regions)[number]) {
    const original = document?.revision?.sources.find((s) => s.page === page);
    const root = `/api/documents/${original?.documentId || documentId}/pages/${original?.sourcePage || page}/image`;
    const query = new URLSearchParams({ v: String(retry) });
    for (const key of ["x", "y", "width", "height"] as const)
      query.set(key, String(crop[key]));
    return `${root}?${query}`;
  }
  function picture(page: number, crop: (typeof regions)[number]) {
    const src = url(page, crop);
    return (
      <figure key={src} className="source-figure">
        {errors[src] ? (
          <p className="notice" role="alert">
            Chưa tải được hình gốc.{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setErrors({});
                setRetry((n) => n + 1);
              }}
            >
              Tải lại hình
            </button>
          </p>
        ) : (
          <img
            src={src}
            alt={`Hình nguyên bản trong trang ${page} của ${question.label || "câu hỏi"}`}
            onError={() => setErrors((old) => ({ ...old, [src]: true }))}
          />
        )}
        <figcaption>Hình từ đề gốc · Trang {page}</figcaption>
      </figure>
    );
  }
  if (!question.hasFigure) return null;
  return (
    <div className="question-source-images">
      {regions.length ? (
        regions.map((region) => picture(region.page, region))
      ) : (
        <p className="notice" role="status">
          {question.figureIssue ||
            "Chưa tách được hình minh họa của câu này. Cần xử lý lại hình từ tài liệu."}
        </p>
      )}
    </div>
  );
}
