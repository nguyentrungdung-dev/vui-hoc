import { z } from "zod";
import { MAX_BYTES, MAX_PAGES } from "../lib/documents";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const createSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    subject: z.enum(["math", "english", "vietnamese", "self"]),
    mode: z.enum(["weekly", "timo"]),
    practiceCount: z.number().int().min(5).max(50),
    pageRange: z.string().trim().max(500),
    files: z
      .array(
        z
          .object({
            name: z
              .string()
              .min(1)
              .max(255)
              .refine((n) => !/[\x00-\x1f]/.test(n)),
            size: z.number().int().positive().max(MAX_BYTES),
            mime: z.enum([
              "application/pdf",
              "image/jpeg",
              "image/png",
              "image/webp",
            ]),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_PAGES),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.files.reduce((s, f) => s + f.size, 0) > MAX_BYTES)
      ctx.addIssue({
        code: "custom",
        message: "Tổng dung lượng tối đa 100 MB.",
      });
    if (
      v.files.some((f) => f.mime === "application/pdf") &&
      v.files.length !== 1
    )
      ctx.addIssue({
        code: "custom",
        message: "Mỗi buổi học dùng một PDF hoặc nhiều ảnh.",
      });
    if (v.mode === "timo" && v.subject !== "math")
      ctx.addIssue({ code: "custom", message: "TIMO thuộc môn Toán." });
  });
export function parsePages(input: string, count: number): number[] {
  if (count < 1 || count > MAX_PAGES)
    throw new AppError(
      `Mỗi tài liệu tối đa ${MAX_PAGES} trang. Hãy tách tài liệu lớn thành các phần.`,
    );
  if (!input.trim()) return Array.from({ length: count }, (_, i) => i + 1);
  if (!/^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(input.trim()))
    throw new AppError("Nhập trang theo dạng 1-3, 5.");
  const pages = new Set<number>();
  for (const part of input.split(",")) {
    const [start, end = start] = part
      .trim()
      .split(/\s*-\s*/)
      .map(Number);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 1 ||
      end < start ||
      end > count
    )
      throw new AppError(
        `Trang phải nằm trong khoảng 1–${count}, theo thứ tự tăng dần.`,
      );
    for (let i = start; i <= end; i++) pages.add(i);
  }
  return [...pages].sort((a, b) => a - b);
}
export function sniffMime(bytes: Buffer): string | null {
  if (bytes.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  return null;
}
const text = z.string().max(16000);
export const batchSchema = z
  .object({
    summary: z.string().max(2000),
    pages: z
      .array(
        z
          .object({
            page: z.number().int().positive(),
            text,
            topics: z.array(z.string().min(1).max(160)).max(30),
            issues: z.array(z.string().max(500)).max(20),
          })
          .strict(),
      )
      .max(2),
    questions: z
      .array(
        z
          .object({
            label: z.string().max(100),
            prompt: text,
            passage: text,
            options: z
              .array(
                z
                  .object({
                    label: z.string().max(30),
                    text: z.string().max(4000),
                  })
                  .strict(),
              )
              .max(30),
            topic: z.string().min(1).max(160),
            skill: z.string().max(500),
            kind: z.enum([
              "multiple_choice",
              "short_answer",
              "fill_blank",
              "matching",
              "ordering",
              "reading",
              "other",
            ]),
            sourcePages: z.array(z.number().int().positive()).min(1).max(2),
            hasFigure: z.boolean(),
            figureDescription: z.string().max(2000),
            figureRegions: z
              .array(
                z
                  .object({
                    page: z.number().int().positive(),
                    x: z.number().min(0).max(1),
                    y: z.number().min(0).max(1),
                    width: z.number().positive().max(1),
                    height: z.number().positive().max(1),
                  })
                  .strict(),
              )
              .max(12)
              .default([]),
            answerFields: z
              .array(
                z
                  .object({
                    id: z.string().min(1).max(80),
                    label: z.string().min(1).max(500),
                  })
                  .strict(),
              )
              .max(30)
              .default([]),
            needsReview: z.boolean(),
            issues: z.array(z.string().max(500)).max(20),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export function validateBatch(value: unknown, pages: number[]) {
  const parsed = batchSchema.safeParse(value);
  if (!parsed.success)
    throw new AppError(
      "AI trả cấu trúc chưa hợp lệ. Hãy thử nhận diện lại phần này.",
      502,
    );
  const result = parsed.data;
  if (
    result.pages.length !== pages.length ||
    new Set(result.pages.map((p) => p.page)).size !== pages.length ||
    result.pages.some((p) => !pages.includes(p.page)) ||
    result.questions.some((q) => q.sourcePages.some((p) => !pages.includes(p)))
  )
    throw new AppError(
      "AI trả tham chiếu trang chưa khớp tài liệu. Hãy thử lại phần này.",
      502,
    );
  for (const q of result.questions) {
    if (!q.prompt.trim()) q.needsReview = true;
    if (
      q.figureRegions.some(
        (r) =>
          !q.sourcePages.includes(r.page) ||
          r.x + r.width > 1.001 ||
          r.y + r.height > 1.001,
      )
    )
      throw new AppError("Vùng hình chưa khớp trang gốc.", 502);
    if (new Set(q.answerFields.map((f) => f.id)).size !== q.answerFields.length)
      throw new AppError("Các ô trả lời bị trùng mã.", 502);
    if (!q.prompt.trim() && !q.issues.length)
      q.issues.push("Không đọc rõ nội dung câu hỏi.");
  }
  return result;
}
