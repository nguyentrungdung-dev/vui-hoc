import { generateSimilarQuestion, failSimilar } from "../server/similar";
export async function similarQuestionStep(
  docId: string,
  id: string,
  index: number,
  execution: string,
) {
  "use step";
  return generateSimilarQuestion(docId, id, index, execution);
}
export async function similarFailureStep(
  docId: string,
  id: string,
  execution: string,
) {
  "use step";
  await failSimilar(docId, id, execution);
}
