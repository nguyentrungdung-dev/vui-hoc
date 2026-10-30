import {
  prepareQuickPractice,
  failQuickPractice,
} from "../server/quick-practice";

export async function quickPracticeSourceStep(id: string, execution: string) {
  "use step";
  return prepareQuickPractice(id, execution);
}
export async function quickPracticeFailureStep(id: string, execution: string) {
  "use step";
  await failQuickPractice(id, execution);
}
