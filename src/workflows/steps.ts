import {
  prepareAnalysis,
  analyzeBatch,
  finishAnalysis,
} from "../server/analysis";
import {
  prepareLearning,
  generatePart,
  finishLearning,
} from "../server/generation";
import { updateJob } from "../server/store";
import { AppError } from "../server/validation";

export async function prepareDocument(id: string, execution: string) {
  "use step";
  try {
    return await prepareAnalysis(id, execution);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    await updateJob(id, (j) => {
      if (j.analysisExecution === execution) {
        j.status = "failed";
        j.message = error.message;
      }
    });
    return [];
  }
}
export async function readDocumentBatch(
  id: string,
  key: string,
  execution: string,
) {
  "use step";
  await analyzeBatch(id, key, execution);
}
export async function finishDocument(id: string, execution: string) {
  "use step";
  await finishAnalysis(id, execution);
}
export async function prepareLesson(id: string, execution: string) {
  "use step";
  return prepareLearning(id, execution);
}
export async function writeLessonPart(
  id: string,
  key: string,
  execution: string,
) {
  "use step";
  await generatePart(id, key, execution);
}
export async function finishLesson(id: string, execution: string) {
  "use step";
  await finishLearning(id, execution);
}
export async function markInterrupted(
  id: string,
  execution: string,
  kind: "analysis" | "learning",
) {
  "use step";
  await updateJob(id, (j) => {
    const message =
      "Tác vụ bị gián đoạn. Phần đã xong được giữ lại; hãy nhấn Thử lại để tiếp tục.";
    if (
      kind === "analysis" &&
      j.analysisExecution === execution &&
      ["queued", "preparing", "analyzing"].includes(j.status)
    ) {
      j.status = j.completedPages.length ? "partial" : "failed";
      j.message = message;
    }
    if (
      kind === "learning" &&
      j.learningExecution === execution &&
      j.learning &&
      ["queued", "generating"].includes(j.learning.status)
    ) {
      j.learning.status = j.learning.parts.some((p) => p.questions.length)
        ? "partial"
        : "failed";
      j.learning.message = message;
    }
  });
}
