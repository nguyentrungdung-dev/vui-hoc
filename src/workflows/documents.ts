import {
  prepareDocument,
  readDocumentBatch,
  finishDocument,
  prepareLesson,
  writeLessonPart,
  finishLesson,
  markInterrupted,
} from "./steps";

export async function analyzeDocumentWorkflow(id: string, execution: string) {
  "use workflow";
  try {
    const keys = await prepareDocument(id, execution);
    for (const key of keys) await readDocumentBatch(id, key, execution);
    await finishDocument(id, execution);
    const lessonKeys = await prepareLesson(id, execution);
    for (const key of lessonKeys) await writeLessonPart(id, key, execution);
    await finishLesson(id, execution);
  } catch {
    await markInterrupted(id, execution, "analysis");
    await markInterrupted(id, execution, "learning");
  }
}
export async function generateLessonWorkflow(id: string, execution: string) {
  "use workflow";
  try {
    const keys = await prepareLesson(id, execution);
    for (const key of keys) await writeLessonPart(id, key, execution);
    await finishLesson(id, execution);
  } catch {
    await markInterrupted(id, execution, "learning");
  }
}
