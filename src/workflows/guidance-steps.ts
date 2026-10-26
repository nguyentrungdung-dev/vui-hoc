import {
  prepareGuidance,
  createGuidanceAudio,
  finishGuidance,
  failGuidance,
} from "../server/guidance";

export async function guidanceSceneStep(
  docId: string,
  id: string,
  execution: string,
) {
  "use step";
  try {
    return await prepareGuidance(docId, id, execution);
  } catch (error) {
    await failGuidance(docId, id, execution, error);
    return 0;
  }
}
export async function guidanceAudioStep(
  docId: string,
  id: string,
  index: number,
  execution: string,
) {
  "use step";
  try {
    return await createGuidanceAudio(docId, id, index, execution);
  } catch (error) {
    await failGuidance(docId, id, execution, error);
    return false;
  }
}
export async function guidanceFinishStep(
  docId: string,
  id: string,
  execution: string,
) {
  "use step";
  await finishGuidance(docId, id, execution);
}
export async function guidanceFailedStep(
  docId: string,
  id: string,
  execution: string,
) {
  "use step";
  await failGuidance(docId, id, execution);
}
