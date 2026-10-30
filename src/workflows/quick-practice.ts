import { sleep } from "workflow";
import {
  quickPracticeSourceStep,
  quickPracticeFailureStep,
} from "./quick-practice-steps";
import { prepareLesson, writeLessonPart, finishLesson } from "./steps";

export async function quickPracticeWorkflow(id: string, execution: string) {
  "use workflow";
  try {
    // Durable suspension: no browser tab or running HTTP request is needed.
    let ready = false;
    for (let poll = 0; poll < 480; poll++) {
      const state = await quickPracticeSourceStep(id, execution);
      if (state === "stop") return;
      if (state === "ready") {
        ready = true;
        break;
      }
      await sleep("15s");
    }
    if (!ready) {
      await quickPracticeFailureStep(id, execution);
      return;
    }
    const keys = await prepareLesson(id, execution);
    for (const key of keys) await writeLessonPart(id, key, execution);
    await finishLesson(id, execution);
  } catch {
    await quickPracticeFailureStep(id, execution);
  }
}
