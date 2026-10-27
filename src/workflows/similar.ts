import { similarQuestionStep, similarFailureStep } from "./similar-steps";
export async function generateSimilarWorkflow(
  docId: string,
  id: string,
  execution: string,
) {
  "use workflow";
  try {
    // Publish the first reviewed question before preparing the rest.
    for (let index = 0; index < 5; index++) {
      if (!(await similarQuestionStep(docId, id, index, execution))) return;
    }
  } catch {
    await similarFailureStep(docId, id, execution);
  }
}
