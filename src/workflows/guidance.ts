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
    // Bounded batches keep TTS latency down without overwhelming the provider.
    for (let index = 0; index < count; index += 3) {
      const results = await Promise.all(
        Array.from({ length: Math.min(3, count - index) }, (_, offset) =>
          guidanceAudioStep(docId, id, index + offset, execution),
        ),
      );
      if (results.some((result) => !result)) {
        await guidanceFailedStep(docId, id, execution);
        return;
      }
    }
    await guidanceFinishStep(docId, id, execution);
  } catch {
    await guidanceFailedStep(docId, id, execution);
  }
}
