import { z } from "zod";
import type { LearningQuestion } from "../lib/learning";
import { normalizeAnswer } from "../lib/learning";
import { AppError } from "./validation";
const short = z.string().max(2000);
export const learningQuestionSchema = z
  .object({
    id: z.string().min(1).max(100),
    sourceIds: z.array(z.string().max(100)).max(12),
    sourcePages: z.array(z.number().int().positive()).min(1).max(12),
    topic: z.string().min(1).max(160),
    label: z.string().max(100),
    prompt: z.string().min(1).max(8000),
    passage: z.string().max(16000),
    options: z
      .array(z.object({ label: z.string().max(30), text: short }).strict())
      .max(30),
    hasFigure: z.boolean(),
    figureDescription: short,
    advanced: z.boolean(),
    translation: z.string().max(16000),
    grading: z.enum(["choice", "exact", "self_review"]),
    rubric: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            label: z.string().min(1).max(500),
            criteria: z.string().min(1).max(2000),
            kind: z.enum(["result", "method"]).default("result"),
            maxPoints: z.number().positive().max(10),
          })
          .strict(),
      )
      .max(30)
      .default([]),
    answer: z.string().min(1).max(4000),
    acceptedAnswers: z.array(z.string().min(1).max(4000)).max(20),
    hints: z.array(z.string().min(1).max(1500)).length(3),
    steps: z.array(z.string().min(1).max(2000)).min(2).max(10),
    explanation: z.string().min(1).max(3000),
    englishSteps: z.array(z.string().max(2000)).max(10),
    checks: z
      .array(
        z
          .object({
            expression: z.string().max(100),
            value: z.number().finite(),
          })
          .strict(),
      )
      .max(12),
  })
  .strict();
export const generatedSchema = z
  .object({
    questions: z.array(learningQuestionSchema).max(8),
    skipped: z
      .array(
        z
          .object({
            sourceId: z.string().max(100),
            reason: z.string().min(1).max(1000),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();
export const reviewSchema = z
  .object({
    reviews: z
      .array(
        z
          .object({
            id: z.string(),
            valid: z.boolean(),
            answer: z.string().max(4000),
            reason: z.string().max(1500),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();
export const generateRequest = z
  .object({
    count: z.number().int().min(0).max(50).default(25),
    scope: z.enum(["original", "practice", "combined"]).default("combined"),
    topics: z.array(z.string().min(1).max(160)).max(200).default([]),
    retry: z.boolean().default(false),
  })
  .strict()
  .refine((v) => (v.scope === "original" ? v.count === 0 : v.count >= 5));
export const startRunRequest = z
  .object({
    kind: z.enum(["practice", "original", "similar"]),
    sourceId: z.string().max(100).optional(),
    topic: z.string().max(160).optional(),
    resume: z.boolean().default(true),
  })
  .strict();
export const runActionSchema = z
  .object({
    eventId: z.uuid(),
    action: z.enum([
      "answer",
      "hint",
      "close_hint",
      "guide",
      "understood",
      "go",
      "finish",
    ]),
    questionId: z.string().max(100).optional(),
    answer: z.string().trim().min(1).max(12000).optional(),
    index: z.number().int().nonnegative().optional(),
  })
  .strict();
// A bounded arithmetic parser, never eval() or model-supplied code.
export function arithmetic(input: string): number {
  const s = input
    .replace(/\s+/g, "")
    .replace(/[×x]/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
  if (!s || s.length > 100 || !/^[\d.+\-*/()]+$/.test(s))
    throw new Error("Phép tính không hợp lệ");
  let i = 0;
  function atom(): number {
    let sign = 1;
    if (s[i] === "-") {
      sign = -1;
      i++;
    } else if (s[i] === "+") i++;
    let n;
    if (s[i] === "(") {
      i++;
      n = expr();
      if (s[i++] !== ")") throw new Error("Thiếu dấu ngoặc");
    } else {
      const m = /^(?:\d+(?:\.\d+)?|\.\d+)/.exec(s.slice(i));
      if (!m) throw new Error("Thiếu số");
      i += m[0].length;
      n = Number(m[0]);
    }
    return sign * n;
  }
  function term(): number {
    let n = atom();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i++];
      const b = atom();
      n = op === "*" ? n * b : n / b;
    }
    return n;
  }
  function expr(): number {
    let n = term();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i++];
      const b = term();
      n = op === "+" ? n + b : n - b;
    }
    return n;
  }
  const n = expr();
  if (i !== s.length || !Number.isFinite(n))
    throw new Error("Phép tính không hợp lệ");
  return n;
}
export function validateTeaching(
  q: LearningQuestion,
  pages: number[],
  sourceIds: string[],
  timo: boolean,
) {
  validateTwoDigitExercise(q);
  if (
    q.grading === "self_review" &&
    q.rubric?.length &&
    new Set(q.rubric.map((r) => r.id)).size !== q.rubric.length
  )
    throw new AppError("Tiêu chí chấm bị trùng mã.", 502);
  if (
    q.sourcePages.some((p) => !pages.includes(p)) ||
    q.sourceIds.some((id) => !sourceIds.includes(id))
  )
    throw new AppError("Câu hỏi tham chiếu nguồn không hợp lệ.", 502);
  if (timo && (!q.translation.trim() || q.englishSteps.length < 2))
    throw new AppError("Câu TIMO thiếu bản dịch hoặc lời giải tiếng Anh.", 502);
  if (
    q.grading === "choice" &&
    (new Set(q.options.map((o) => normalizeAnswer(o.label))).size !==
      q.options.length ||
      new Set(q.options.map((o) => normalizeAnswer(o.text))).size !==
        q.options.length)
  )
    throw new AppError("Câu hỏi có lựa chọn trùng nhau.", 502);
  if (
    q.grading === "choice" &&
    (q.options.length < 2 ||
      q.options.some((o) => !o.label.trim() || !o.text.trim()) ||
      !q.options.some((o) => o.label === q.answer) ||
      q.acceptedAnswers.length)
  )
    throw new AppError(
      `Câu ${q.id}: đáp án trắc nghiệm phải là nhãn trong ${JSON.stringify(q.options.map((o) => o.label))}, acceptedAnswers phải rỗng. Nếu nguồn không có lựa chọn, dùng exact hoặc self_review.`,
      502,
    );
  for (const check of q.checks) {
    let n;
    try {
      n = arithmetic(check.expression);
    } catch {
      throw new AppError("Phép kiểm tra số học chưa hợp lệ.", 502);
    }
    if (Math.abs(n - check.value) > 1e-8)
      throw new AppError("Lời giải có phép tính không nhất quán.", 502);
  }
}

// Exact check for the bounded digit-enumeration exercises common in these worksheets.
// Only apply to this unambiguous wording; other problem types use the AI checks.
export function validateTwoDigitExercise(q: LearningQuestion) {
  if (q.grading !== "choice") return;
  const match =
    /^từ\s+các\s+chữ\s+số\s+((?:\d\s*[;,]\s*)+\d)\s*[,.:]?\s*(.*)$/iu.exec(
      q.prompt.trim(),
    );
  if (!match) return;
  const task =
    /^(?:hãy\s+)?viết\s+(?:(được\s+bao\s+nhiêu)\s+|(?:tất\s+cả\s+)?(?:các\s+)?)số\s+(chẵn|lẻ)\s+có\s+2\s+chữ\s+số(\s+khác\s+nhau)?[.?!\s]*$/iu.exec(
      match[2],
    );
  if (!task) return;
  const digits = [...new Set((match[1].match(/\d/g) || []).map(Number))];
  const expected: number[] = [];
  for (const tens of digits)
    for (const units of digits) {
      if (tens === 0 || (task[3] && tens === units)) continue;
      if (units % 2 === (task[2].toLocaleLowerCase("vi-VN") === "chẵn" ? 0 : 1))
        expected.push(tens * 10 + units);
    }
  expected.sort((a, b) => a - b);
  const correct = q.options.filter((option) => {
    const numbers = (option.text.match(/\d+/g) || []).map(Number);
    return task[1]
      ? numbers.length === 1 && numbers[0] === expected.length
      : JSON.stringify(numbers.sort((a, b) => a - b)) ===
          JSON.stringify(expected);
  });
  if (correct.length !== 1 || correct[0].label !== q.answer)
    throw new AppError(
      `Câu ${q.id}: đếm lại các số theo điều kiện được ${expected.join(", ")} (${expected.length} số). Đáp án và danh sách lựa chọn chưa nhất quán.`,
      502,
    );
}

export const consistencySchema = z
  .object({
    reviews: z
      .array(
        z
          .object({
            id: z.string(),
            valid: z.boolean(),
            reason: z.string().max(1500),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();
export const assessmentSchema = z
  .object({
    confident: z.boolean(),
    feedback: z.string().max(2000),
    parts: z
      .array(
        z
          .object({
            id: z.string().max(100),
            confident: z.boolean(),
            points: z.number().nonnegative().max(10),
            feedback: z.string().max(1500),
          })
          .strict(),
      )
      .max(60),
  })
  .strict();

// Compare the fields that carry meaning. JSONB may reorder object keys.
export function sameSourceOptions(
  a: { label: string; text: string }[],
  b: { label: string; text: string }[],
) {
  const value = (s: string) => s.normalize("NFC").replace(/\s+/gu, " ").trim();
  return (
    a.length === b.length &&
    a.every(
      (o, i) =>
        value(o.label) === value(b[i].label) &&
        value(o.text) === value(b[i].text),
    )
  );
}
