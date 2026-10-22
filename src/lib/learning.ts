import type { DocumentJob, ExtractedQuestion } from "./documents";

export type LearningQuestion = {
  id: string;
  sourceIds: string[];
  sourcePages: number[];
  topic: string;
  label: string;
  prompt: string;
  passage: string;
  options: { label: string; text: string }[];
  hasFigure: boolean;
  figureDescription: string;
  advanced: boolean;
  translation: string;
  grading: "choice" | "exact" | "self_review";
  answer: string;
  acceptedAnswers: string[];
  hints: string[];
  steps: string[];
  explanation: string;
  englishSteps: string[];
  checks: { expression: string; value: number }[];
};
export type LearningPart = {
  key: string;
  kind: "original" | "practice";
  sourceIds: string[];
  count: number;
  done: boolean;
  questions: LearningQuestion[];
  skipped: { sourceId: string; reason: string }[];
  error?: string;
};
export type LearningPack = {
  id: string;
  status:
    "queued" | "generating" | "ready" | "partial" | "failed" | "waiting_config";
  count: number;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  model: string;
  message: string;
  parts: LearningPart[];
  reviewNotes?: string[];
};
export type LearningAttempt = {
  first?: string;
  firstCorrect?: boolean;
  last?: string;
  tries: number;
  solved: boolean;
  guided: boolean;
  hintOpens: number;
  hintMs: number;
  hintOpenedAt?: number;
  hintLevel: number;
};
export type LearningRun = {
  /** Absent only on legacy runs, which belong to the original document creator. */
  owner?: string;
  id: string;
  documentId: string;
  title: string;
  packId: string;
  mode: DocumentJob["mode"];
  kind: "original" | "practice" | "similar";
  questions: LearningQuestion[];
  attempts: Record<string, LearningAttempt>;
  index: number;
  finished: boolean;
  createdAt: string;
  updatedAt: string;
  eventIds: string[];
};
export type QuestionView = Omit<
  LearningQuestion,
  | "answer"
  | "acceptedAnswers"
  | "hints"
  | "steps"
  | "explanation"
  | "englishSteps"
  | "checks"
> & {
  hint?: string;
  solution?: Pick<
    LearningQuestion,
    "answer" | "steps" | "explanation" | "englishSteps"
  >;
};
export type LearningResult = {
  id: string;
  documentId: string;
  title: string;
  kind: LearningRun["kind"];
  date: string;
  finished: boolean;
  total: number;
  gradable: number;
  firstCorrect: number;
  solved: number;
  independent: number;
  hints: number;
  hintMs: number;
  score: number | null;
  byTopic: {
    topic: string;
    total: number;
    gradable: number;
    correct: number;
    hints: number;
  }[];
};
export type RunView = Omit<LearningRun, "questions" | "eventIds" | "owner"> & {
  questions: QuestionView[];
  result: LearningResult;
};
export type LearningView = {
  pack:
    | null
    | (Omit<LearningPack, "parts"> & {
        originalCount: number;
        practiceCount: number;
        completedParts: number;
        totalParts: number;
        skipped: { sourceId: string; reason: string }[];
        errors: string[];
      });
  runs: LearningResult[];
  sources: Pick<ExtractedQuestion, "id" | "label" | "topic" | "needsReview">[];
};
export const emptyLearningAttempt = (): LearningAttempt => ({
  tries: 0,
  solved: false,
  guided: false,
  hintOpens: 0,
  hintMs: 0,
  hintLevel: 0,
});
// Keep Vietnamese accents and math punctuation: removing them can change the answer.
export function normalizeAnswer(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ")
    .replace(/−/g, "-");
}
export function isCorrect(q: LearningQuestion, value: string) {
  if (q.grading === "self_review") return false;
  return [q.answer, ...q.acceptedAnswers].some(
    (a) => normalizeAnswer(a) === normalizeAnswer(value),
  );
}
export function learningResult(run: LearningRun): LearningResult {
  const gradable = run.questions.filter((q) => q.grading !== "self_review");
  const firstCorrect = gradable.filter(
    (q) => run.attempts[q.id]?.firstCorrect === true,
  ).length;
  const attempts = Object.values(run.attempts);
  return {
    id: run.id,
    documentId: run.documentId,
    title: run.title,
    kind: run.kind,
    date: run.updatedAt,
    finished: run.finished,
    total: run.questions.length,
    gradable: gradable.length,
    firstCorrect,
    solved: attempts.filter((a) => a.solved).length,
    independent: gradable.filter((q) => {
      const a = run.attempts[q.id];
      return a?.firstCorrect && !a.guided && !a.hintOpens;
    }).length,
    hints: attempts.reduce((n, a) => n + a.hintOpens, 0),
    hintMs: attempts.reduce((n, a) => n + a.hintMs, 0),
    score: gradable.length
      ? Math.round((firstCorrect / gradable.length) * 100) / 10
      : null,
    byTopic: [...new Set(run.questions.map((q) => q.topic))].map((topic) => {
      const qs = run.questions.filter((q) => q.topic === topic);
      return {
        topic,
        total: qs.length,
        gradable: qs.filter((q) => q.grading !== "self_review").length,
        correct: qs.filter((q) => run.attempts[q.id]?.firstCorrect).length,
        hints: qs.reduce((n, q) => n + (run.attempts[q.id]?.hintOpens || 0), 0),
      };
    }),
  };
}
export function runView(run: LearningRun): RunView {
  const { eventIds: _events, owner: _owner, questions, ...rest } = run;
  return {
    ...rest,
    result: learningResult(run),
    questions: questions.map((q) => {
      const {
        answer,
        acceptedAnswers: _accepted,
        hints,
        steps,
        explanation,
        englishSteps,
        checks: _checks,
        ...safe
      } = q;
      const attempt = run.attempts[q.id];
      return {
        ...safe,
        ...(attempt?.hintLevel
          ? { hint: hints[Math.min(attempt.hintLevel, hints.length) - 1] }
          : {}),
        ...(attempt?.solved || attempt?.guided || run.finished
          ? { solution: { answer, steps, explanation, englishSteps } }
          : {}),
      };
    }),
  };
}
