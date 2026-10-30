import { updateJob } from "./store";
import { AppError } from "./validation";

// A small injectable boundary keeps route tests independent of the Workflow runtime.
export const dispatcher = {
  async start(
    kind: "analysis" | "learning" | "quick-practice",
    id: string,
    execution: string,
  ) {
    const { start } = await import("workflow/api");
    if (kind === "quick-practice") {
      const { quickPracticeWorkflow } =
        await import("../workflows/quick-practice");
      await start(quickPracticeWorkflow, [id, execution]);
      return;
    }
    const { analyzeDocumentWorkflow, generateLessonWorkflow } =
      await import("../workflows/documents");
    await start(
      kind === "analysis" ? analyzeDocumentWorkflow : generateLessonWorkflow,
      [id, execution],
    );
  },
};
export async function enqueue(
  kind: "analysis" | "learning" | "quick-practice",
  id: string,
  execution: string,
) {
  try {
    await dispatcher.start(kind, id, execution);
  } catch {
    await updateJob(id, (j) => {
      const message = "Chưa đưa được tác vụ vào hàng chờ. Hãy nhấn Thử lại.";
      if (
        kind === "analysis" &&
        j.analysisExecution === execution &&
        j.status === "queued"
      ) {
        j.status = "failed";
        j.message = message;
        // Fence off a workflow whose start succeeded but acknowledgement was lost.
        delete j.analysisExecution;
      }
      if (
        kind === "quick-practice" &&
        j.learningExecution === execution &&
        j.quickPractice?.waitingForSource
      ) {
        j.status = "failed";
        j.message = message;
        delete j.learningExecution;
      }
      if (
        ["learning", "quick-practice"].includes(kind) &&
        j.learningExecution === execution &&
        j.learning?.status === "queued"
      ) {
        j.learning.status = "failed";
        j.learning.message = message;
        delete j.learningExecution;
      }
    });
    throw new AppError(
      "Tài liệu đã lưu nhưng chưa khởi động được xử lý. Mở tài liệu và nhấn Thử lại.",
      503,
    );
  }
}
