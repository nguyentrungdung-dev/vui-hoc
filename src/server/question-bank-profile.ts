import { createHash } from "node:crypto";
import type { LearningQuestion } from "../lib/learning";
import { QUESTION_CONTEXT_POLICY } from "../lib/question-context";
import type { SimilarDifficulty } from "../lib/similar";
import { similarContract, SIMILAR_POLICY_VERSION } from "./similar-policy";

export const BANK_POLICY = `bank-2026-10-30.2:${QUESTION_CONTEXT_POLICY}:${SIMILAR_POLICY_VERSION}:practice-1`;
export const bankHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const bankText = (s: string) =>
  s.normalize("NFC").replace(/\s+/gu, " ").trim();
export type BankProfile = {
  key: string;
  policy: string;
  subject: string;
  mode: string;
  grade: 2;
  kind: "similar" | "practice";
};
type Source = Pick<
  LearningQuestion,
  "prompt" | "passage" | "options" | "topic"
> &
  Partial<LearningQuestion>;
export function bankContentKey(subject: string, mode: string, q: Source) {
  return bankHash([
    subject,
    mode,
    q.grading,
    bankText(q.prompt),
    bankText(q.passage),
    q.options.map((o) => bankText(o.text)).sort(),
    (q.answerFields || []).map((f) => bankText(f.label)),
  ]);
}

// Generalize only an unambiguous addition/subtraction exercise. All other tasks
// retain exact source context; do not infer English grammar or word-problem types.
function arithmeticShape(q: Source) {
  if (q.passage.trim() || q.hasFigure) return null;
  let values = (q.answerFields || []).map((f) => f.label);
  const prompt = bankText(q.prompt).replace(
    /^(?:Câu|Bài)\s+\d+\s*[.:)]\s*/iu,
    "",
  );
  if (values.length) {
    const task = prompt
      .replace(/\d+\s*[+−–-]\s*\d+/gu, "")
      .replace(/[\s:;,.?=_]/gu, "")
      .toLowerCase();
    if (!["đặttínhrồitính", "đặttính", "tính"].includes(task)) return null;
  } else {
    const match =
      /^(?:tính\s*:?\s*)?(\d+\s*[+−–-]\s*\d+)\s*(?:=\s*[?. _]*|\?)?$/iu.exec(
        prompt,
      );
    if (!match) return null;
    values = [match[1]];
  }
  const shapes = values.map((value) => {
    const match = /^(\d+)\s*([+−–-])\s*(\d+)$/u.exec(value.trim());
    if (!match) return null;
    let a = Number(match[1]),
      b = Number(match[3]);
    const subtract = match[2] !== "+",
      result = subtract ? a - b : a + b;
    if (a > 999 || b > 999 || result < 0 || result > 999) return null;
    let carry = 0,
      count = 0;
    while (a || b) {
      carry = subtract
        ? Number((a % 10) - carry < b % 10)
        : Number((a % 10) + (b % 10) + carry >= 10);
      count += carry;
      a = Math.floor(a / 10);
      b = Math.floor(b / 10);
    }
    return [
      subtract ? "-" : "+",
      match[1].length,
      match[3].length,
      String(result).length,
      count,
    ];
  });
  return shapes.every(Boolean)
    ? {
        task:
          values.length > 1 || /đặt tính/iu.test(prompt)
            ? "column-calculation"
            : "calculation",
        shapes,
      }
    : null;
}
function sourceContext(q: Source) {
  return {
    topic: bankText(q.topic),
    grading: q.grading,
    kind: q.inputKind,
    fieldCount: q.answerFields?.length || 0,
    optionCount: q.options.length,
    source: arithmeticShape(q) || {
      prompt: bankText(q.prompt),
      passage: bankText(q.passage),
      options: q.options.map((o) => [bankText(o.label), bankText(o.text)]),
      fields: q.answerFields?.map((f) => bankText(f.label)),
      figure: q.hasFigure
        ? [
            q.figureDescription,
            q.sourceIds,
            q.figureRegions?.map((r) => [r.page, r.x, r.y, r.width, r.height]),
          ]
        : null,
    },
  };
}
function profile(
  subject: string,
  mode: string,
  kind: BankProfile["kind"],
  context: unknown,
): BankProfile {
  return {
    key: bankHash([BANK_POLICY, subject, mode, 2, kind, context]),
    policy: BANK_POLICY,
    subject,
    mode,
    grade: 2,
    kind,
  };
}
export function similarBankProfile(
  subject: string,
  mode: string,
  source: LearningQuestion,
  difficulty: SimilarDifficulty,
  index: number,
  prior: LearningQuestion[],
  sourceDocumentId?: string,
) {
  return profile(subject, mode, "similar", {
    source: sourceContext(source),
    figureDocument: source.hasFigure
      ? sourceDocumentId || bankHash(source)
      : undefined,
    contract: similarContract(source, difficulty, index),
    // Progressive evidence is tied to its preceding sequence, not just a difficulty label.
    prior:
      difficulty === "progressive"
        ? prior.map((q) => bankContentKey(subject, mode, q))
        : [],
  });
}
export function practiceBankProfile(
  subject: string,
  mode: string,
  seed: Source | { text: string; topics: string[] },
  topic: string,
  advanced: boolean,
  timo: boolean,
  sourceDocumentId?: string,
) {
  return profile(subject, mode, "practice", {
    topic: bankText(topic),
    figureDocument:
      "prompt" in seed && seed.hasFigure
        ? sourceDocumentId || bankHash(seed)
        : undefined,
    advanced,
    timo,
    output: "choice:3-4:one-answer",
    source:
      "prompt" in seed
        ? sourceContext(seed)
        : {
            text: bankText(seed.text),
            topics: seed.topics.map(bankText).sort(),
          },
  });
}
