import {
  guidanceSceneStep,
  guidanceAudioStep,
  guidanceFinishStep,
  guidanceFailedStep,
} from "./guidance-steps";

export async function generateGuidanceWorkflow(
  docId: string,
  id: string,
  execution: string,
) {
  "use workflow";
  try {
    const count = await guidanceSceneStep(docId, id, execution);
    if (!count) return;
    for (let index = 0; index < count; index++) {
      if (!(await guidanceAudioStep(docId, id, index, execution))) return;
    }
    await guidanceFinishStep(docId, id, execution);
  } catch {
    await guidanceFailedStep(docId, id, execution);
  }
}
