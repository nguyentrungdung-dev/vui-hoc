import type { LearningPack } from "./learning";

export type QuickPractice = {
  sourceDocumentId: string;
  waitingForSource: boolean;
  dispatched?: boolean;
};
export type QuickPracticeView = {
  id: string;
  count: number;
  status: "waiting_source" | LearningPack["status"];
  message: string;
  createdCount: number;
  createdAt: string;
};
export const quickPracticeActive = (status: QuickPracticeView["status"]) =>
  ["waiting_source", "queued", "generating"].includes(status);
