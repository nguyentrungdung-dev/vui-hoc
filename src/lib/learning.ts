import type {
  DocumentJob,
  ExtractedQuestion,
  FigureRegion,
  AnswerField,
} from "./documents";

export type RubricItem = {
  id: string;
  label: string;
  criteria: string;
  maxPoints: number;
};
export type AnswerAssessment = {
  status: "graded" | "ungraded";
  feedback: string;
  points: number;
  maxPoints: number;
  parts: {
    id: string;
    label: string;
    points: number;
    maxPoints: number;
    feedback: string;
  }[];
};
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
  grading: "choice" | "exact" | "self_review" | "ungraded";
  rubric?: RubricItem[];
  answerFields?: AnswerField[];
  figureRegions?: FigureRegion[];
  figureIssue?: string;
  warnings?: string[];
  inputKind?: ExtractedQuestion["kind"];
  ungradableReason?: string;
  contentVersion?: number;
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
  contentVersion?: number;
};
export type LearningAttempt = {
  first?: string;
  firstCorrect?: boolean;
  firstCredit?: number;
  assessment?: AnswerAssessment;
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
  /** Legacy metadata only. Demo runs are shared; this field never grants access. */
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
  | "rubric"
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
        verifiedOriginalCount: number;
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
  if (q.grading === "self_review" || q.grading === "ungraded") return false;
  return [q.answer, ...q.acceptedAnswers].some(
    (a) => normalizeAnswer(a) === normalizeAnswer(value),
  );
}
export function protectLegacyRun(run: LearningRun): LearningRun {
  if (run.finished) return run; // Historical results remain records of their original grading.
  const attempts = { ...run.attempts };
  const questions = run.questions.map((q): LearningQuestion => {
    if (q.contentVersion === 2) return q;
    const reason =
      "Bài này được chuẩn bị bằng phiên bản cũ, chưa qua kiểm tra tính nhất quán mới. Bài làm vẫn được lưu; hãy cập nhật bài gốc trước khi chấm đúng/sai.";
    if (attempts[q.id])
      attempts[q.id] = {
        ...attempts[q.id],
        solved: false,
        guided: false,
        firstCorrect: undefined,
        firstCredit: undefined,
        assessment: {
          status: "ungraded",
          feedback: reason,
          points: 0,
          maxPoints: 0,
          parts: [],
        },
      };
    return {
      ...q,
      contentVersion: 2,
      grading: "ungraded",
      inputKind:
        q.inputKind || (q.grading === "choice" ? "multiple_choice" : "other"),
      answer: "",
      acceptedAnswers: [],
      hints: [],
      steps: [],
      explanation: "",
      englishSteps: [],
      checks: [],
      rubric: [],
      ungradableReason: reason,
    };
  });
  return { ...run, attempts, questions };
}
export function canGrade(q: Pick<LearningQuestion, "grading" | "rubric">) {
  return (
    q.grading !== "ungraded" &&
    (q.grading !== "self_review" || !!q.rubric?.length)
  );
}
export function learningResult(run: LearningRun): LearningResult {
  const gradable = run.questions.filter(
    (q) => canGrade(q) && run.attempts[q.id]?.assessment?.status !== "ungraded",
  );
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
      ? Math.round(
          (gradable.reduce(
            (n, q) =>
              n +
              (run.attempts[q.id]?.firstCredit ??
                (run.attempts[q.id]?.firstCorrect ? 1 : 0)),
            0,
          ) /
            gradable.length) *
            100,
        ) / 10
      : null,
    byTopic: [...new Set(run.questions.map((q) => q.topic))].map((topic) => {
      const qs = run.questions.filter((q) => q.topic === topic);
      return {
        topic,
        total: qs.length,
        gradable: qs.filter(
          (q) =>
            canGrade(q) &&
            (run.attempts[q.id]?.assessment?.status !== "ungraded" ||
              run.attempts[q.id]?.firstCredit !== undefined),
        ).length,
        correct: qs.filter(
          (q) =>
            gradable.some((g) => g.id === q.id) &&
            run.attempts[q.id]?.firstCorrect,
        ).length,
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
        rubric: _rubric,
        ...safe
      } = q;
      const attempt = run.attempts[q.id];
      return {
        ...safe,
        ...(attempt?.hintLevel
          ? { hint: hints[Math.min(attempt.hintLevel, hints.length) - 1] }
          : {}),
        ...(q.grading !== "ungraded" &&
        (attempt?.solved || attempt?.guided || run.finished)
          ? { solution: { answer, steps, explanation, englishSteps } }
          : {}),
      };
    }),
  };
}
