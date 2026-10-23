import type { LearningPack } from "./learning";
import type { Revision } from "./revision";
export const subjects = {
  math: {
    name: "Toán",
    path: "/toan",
    icon: "🧮",
    description: "Bài tập trên lớp, toán tư duy và đề TIMO.",
  },
  english: {
    name: "Tiếng Anh",
    path: "/tieng-anh",
    icon: "🌏",
    description: "Từ vựng, câu đơn giản và bài đọc của em.",
  },
  vietnamese: {
    name: "Tiếng Việt",
    path: "/tieng-viet",
    icon: "📚",
    description: "Tập đọc, chính tả và luyện từ, luyện câu.",
  },
  self: {
    name: "Tự học",
    path: "/tu-hoc",
    icon: "🌱",
    description: "Khám phá chủ đề em thích từ tài liệu của mình.",
  },
} as const;
export type Subject = keyof typeof subjects;
export const MAX_BYTES = 100 * 1024 * 1024;
export const MAX_PAGES = 100;
export type SourceFile = {
  name: string;
  size: number;
  mime: string;
  uploaded: boolean;
};
export type ExtractedQuestion = {
  id: string;
  label: string;
  prompt: string;
  passage: string;
  options: { label: string; text: string }[];
  topic: string;
  skill: string;
  kind: string;
  sourcePages: number[];
  hasFigure: boolean;
  figureDescription: string;
  needsReview: boolean;
  issues: string[];
};
export type AnalysisPage = {
  page: number;
  text: string;
  topics: string[];
  issues: string[];
};
export type AnalysisBatch = {
  summary: string;
  pages: AnalysisPage[];
  questions: Omit<ExtractedQuestion, "id">[];
};
export type DocumentStatus =
  | "uploading"
  | "queued"
  | "preparing"
  | "waiting_config"
  | "analyzing"
  | "partial"
  | "complete"
  | "failed";
export type DocumentJob = {
  id: string;
  title: string;
  subject: Subject;
  mode: "weekly" | "timo";
  practiceCount: number;
  pageRange: string;
  files: SourceFile[];
  createdAt: string;
  updatedAt: string;
  status: DocumentStatus;
  message: string;
  totalPages: number;
  selectedPages: number[];
  completedPages: number[];
  batches: {
    key: string;
    pages: number[];
    result?: AnalysisBatch;
    error?: string;
  }[];
  model: string;
  owner: string;
  learning?: LearningPack;
  storage?: "local" | "blob";
  analysisExecution?: string;
  learningExecution?: string;
  revision?: Revision;
};
export type PublicDocument = Omit<
  DocumentJob,
  "owner" | "batches" | "learning" | "analysisExecution" | "learningExecution"
> & {
  canManage: boolean;
  summaries: string[];
  pages: AnalysisPage[];
  questions: ExtractedQuestion[];
  failures: { pages: number[]; message: string }[];
};
export const statusNames: Record<DocumentStatus, string> = {
  uploading: "Đang tải tài liệu",
  queued: "Đang chờ xử lý",
  preparing: "Đang đọc tài liệu",
  waiting_config: "Chờ cấu hình AI",
  analyzing: "Đang nhận diện",
  partial: "Đã nhận diện một phần",
  complete: "Đã nhận diện xong",
  failed: "Cần thử lại",
};
export function publicDocument(
  job: DocumentJob,
  viewer?: string,
): PublicDocument {
  const {
    owner: _owner,
    learning: _learning,
    analysisExecution: _analysis,
    learningExecution: _generation,
    batches,
    ...rest
  } = job;
  return {
    ...rest,
    canManage: viewer === job.owner,
    summaries: batches.flatMap((b) =>
      b.result?.summary ? [b.result.summary] : [],
    ),
    pages: batches.flatMap((b) => b.result?.pages ?? []),
    questions: batches.flatMap((b) =>
      (b.result?.questions ?? []).map((q, i) => ({
        ...q,
        id: `${b.key}-${i}`,
      })),
    ),
    failures: batches
      .filter((b) => b.error)
      .map((b) => ({ pages: b.pages, message: b.error! })),
  };
}
