import { randomUUID } from "node:crypto";
import { z } from "zod";
import { similarDifficulties, type SimilarDifficulty } from "../lib/similar";
import {
  runView,
  type LearningQuestion,
  type LearningRun,
} from "../lib/learning";
import { readRun, readWorkflowRun, saveRun } from "./learning-runs";
import { lock } from "./store";
import { AppError } from "./validation";
import { modelName } from "./analysis";
import { teachingAI } from "./teaching-ai";
import { validateCalculationBand } from "./similar-calculations";
import {
  learningQuestionSchema,
  validateTeaching,
} from "./learning-validation";

import {
  similarContract,
  similarDraftPrompt,
  similarReviewPrompt,
  similarReviewSchema,
  validateSimilarStructure,
  approveSimilarReview,
  sameSimilarContent,
} from "./similar-policy";

const requestSchema = z
  .object({
    questionId: z.string().min(1).max(100),
    requestId: z.uuid(),
    difficulty: z
      .enum(
        similarDifficulties.map((d) => d.value) as [
          SimilarDifficulty,
          ...SimilarDifficulty[],
        ],
      )
      .default("progressive"),
  })
  .strict();
export const similarDispatcher = {
  async start(docId: string, id: string, execution: string) {
    const { start } = await import("workflow/api");
    const { generateSimilarWorkflow } = await import("../workflows/similar");
    await start(generateSimilarWorkflow, [docId, id, execution]);
  },
};
async function dispatch(run: LearningRun) {
  try {
    await similarDispatcher.start(
      run.documentId,
      run.id,
      run.similar!.execution,
    );
  } catch {
    await failSimilar(
      run.documentId,
      run.id,
      run.similar!.execution,
      "Chưa khởi động được. Em nhấn Thử lại để tiếp tục.",
    );
  }
}
export async function requestSimilar(
  docId: string,
  sourceRunId: string,
  viewer: string,
  input: unknown,
) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError("Chọn câu nguồn và mức độ khó hợp lệ.");
  if (!process.env.OPENROUTER_API_KEY?.trim())
    throw new AppError("Chưa cấu hình AI để tạo câu luyện tập.", 503);
  const config = parsed.data;
  const next = await lock(`run:${docId}:${sourceRunId}`, async () => {
    const parent = await readRun(docId, sourceRunId, viewer);
    const source = parent.questions.find((q) => q.id === config.questionId);
    if (
      !source ||
      source.contentVersion !== 2 ||
      source.grading === "ungraded" ||
      !source.hints.length
    )
      throw new AppError(
        "Câu nguồn chưa có lời giải được kiểm tra để tạo câu tương tự.",
        409,
      );
    // The request ID is saved before dispatch. Retries/double clicks reuse the run.
    const prior = parent.similarRequests?.[config.requestId];
    if (prior)
      return { run: await readRun(docId, prior, viewer), start: false };
    const now = new Date().toISOString();
    const run: LearningRun = {
      owner: viewer,
      id: randomUUID(),
      documentId: docId,
      title: `5 câu luyện thêm · ${source.label || source.topic}`,
      packId: parent.packId,
      mode: parent.mode,
      kind: "similar",
      questions: [],
      attempts: {},
      index: 0,
      finished: false,
      createdAt: now,
      updatedAt: now,
      eventIds: [],
      similar: {
        sourceRunId,
        source: structuredClone(source),
        difficulty: config.difficulty,
        status: "queued",
        execution: randomUUID(),
        requestId: config.requestId,
        model: modelName(),
        message: "Đang chuẩn bị câu đầu tiên và gợi ý cho em…",
        updatedAt: now,
        target: 5,
      },
    };
    await saveRun(run);
    parent.similarRequests = {
      ...parent.similarRequests,
      [config.requestId]: run.id,
    };
    await saveRun(parent);
    return { run, start: true };
  });
  if (next.start) await dispatch(next.run);
  return runView(await readRun(docId, next.run.id, viewer));
}
export async function retrySimilar(docId: string, id: string, viewer: string) {
  const next = await lock(`run:${docId}:${id}`, async () => {
    const run = await readRun(docId, id, viewer),
      g = run.similar;
    if (!g || run.finished)
      throw new AppError("Không có bộ câu đang chờ tạo.", 409);
    if (g.status === "ready") return { run, start: false };
    const stale = Date.now() - Date.parse(g.updatedAt) > 10 * 60 * 1000;
    if (g.status !== "failed" && !stale) return { run, start: false };
    g.status = "queued";
    delete g.lastError;
    g.execution = randomUUID();
    g.updatedAt = new Date().toISOString();
    g.message = "Đang tiếp tục các câu còn thiếu; bài em đã làm vẫn được giữ.";
    await saveRun(run);
    return { run, start: true };
  });
  if (next.start) await dispatch(next.run);
  return runView(await readRun(docId, id, viewer));
}
export async function failSimilar(
  docId: string,
  id: string,
  execution: string,
  message = "Chưa chuẩn bị xong câu mới. Em có thể làm câu đã có và nhấn Thử lại.",
  detail?: string,
) {
  await lock(`run:${docId}:${id}`, async () => {
    const run = await readWorkflowRun(docId, id);
    if (
      !run.similar ||
      run.similar.execution !== execution ||
      run.similar.status === "ready"
    )
      return;
    run.similar.status = "failed";
    run.similar.message = message;
    if (detail) run.similar.lastError = detail;
    run.similar.updatedAt = new Date().toISOString();
    // Fence delayed work after a failed dispatch or interrupted workflow.
    run.similar.execution = randomUUID();
    await saveRun(run);
  });
}

const draftSchema = z
  .object({
    question: learningQuestionSchema,
    answerFields: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            label: z.string().min(1).max(500),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();
export async function buildSimilarQuestion(
  source: LearningQuestion,
  difficulty: SimilarDifficulty,
  index: number,
  prior: LearningQuestion[],
  model: string,
) {
  const contract = similarContract(source, difficulty, index);
  const signal = AbortSignal.timeout(240000);
  let error = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const draft = await teachingAI(
        draftSchema,
        "similar_question",
        similarDraftPrompt,
        [
          {
            type: "text",
            text: JSON.stringify({
              source,
              contract,
              index,
              total: 5,
              prior: prior.map((q) => ({
                prompt: q.prompt,
                passage: q.passage,
                answerFields: q.answerFields,
              })),
              correction: error,
            }),
          },
        ],
        signal,
        model,
      );
      const q: LearningQuestion = {
        ...draft.question,
        id: `similar-${index + 1}`,
        label: `Câu ${index + 1}`,
        sourceIds: [...source.sourceIds],
        sourcePages: [...source.sourcePages],
        answerFields: draft.answerFields,
        hasFigure: false,
        figureDescription: "",
        figureRegions: [],
        contentVersion: 2,
        warnings: [],
        inputKind: source.inputKind,
        advanced: contract.level === "advanced",
      };
      // Validate the raw media declaration before normalizing figure fields.
      validateSimilarStructure(source, {
        ...q,
        hasFigure: draft.question.hasFigure,
      });
      if ([source, ...prior].some((p) => sameSimilarContent(p, q)))
        throw new AppError(
          "DUPLICATE: Câu mới trùng nội dung nguồn hoặc câu đã tạo; đổi dữ kiện thực sự.",
          502,
        );
      validateTeaching(q, source.sourcePages, source.sourceIds, false);
      validateCalculationBand(source, q, difficulty, index);
      const reviewed = await teachingAI(
        similarReviewSchema,
        "similar_question_review",
        similarReviewPrompt,
        [
          {
            type: "text",
            text: JSON.stringify({
              source,
              contract,
              difficulty,
              index,
              prior: prior.map((p) => ({
                prompt: p.prompt,
                passage: p.passage,
                answerFields: p.answerFields,
              })),
              question: q,
            }),
          },
        ],
        signal,
        model,
      );
      approveSimilarReview(contract, q, reviewed);
      q.generationApproval = {
        policy: contract.version,
        model,
        level: contract.level,
        at: new Date().toISOString(),
        attempts: attempt + 1,
        review: reviewed,
      };
      return q;
    } catch (e) {
      signal.throwIfAborted();
      // Credentials/credit problems cannot be repaired by generating another draft.
      if (e instanceof AppError && e.status === 503) throw e;
      error = e instanceof Error ? e.message : "Chưa tạo được câu mới.";
    }
  }
  throw new AppError(error, 502);
}
export async function generateSimilarQuestion(
  docId: string,
  id: string,
  index: number,
  execution: string,
) {
  const snapshot = await readWorkflowRun(docId, id);
  const g = snapshot.similar;
  if (
    !g ||
    g.execution !== execution ||
    snapshot.finished ||
    g.status === "failed"
  )
    return false;
  if (snapshot.questions.length > index) return true;
  if (snapshot.questions.length !== index || index < 0 || index >= 5)
    return false;
  try {
    const q = await buildSimilarQuestion(
      g.source,
      g.difficulty,
      index,
      snapshot.questions,
      g.model,
    );
    return await lock(`run:${docId}:${id}`, async () => {
      const current = await readWorkflowRun(docId, id);
      if (
        !current.similar ||
        current.similar.execution !== execution ||
        current.finished
      )
        return false;
      if (current.questions.length > index) return true;
      if (current.questions.length !== index) return false;
      current.questions.push(q);
      current.similar.status =
        current.questions.length === 5 ? "ready" : "generating";
      current.similar.message =
        current.questions.length === 5
          ? "Đã chuẩn bị đủ 5 câu và gợi ý cho em."
          : `Đã có ${current.questions.length}/5 câu. Em làm trước nhé, các câu sau đang được chuẩn bị.`;
      delete current.similar.lastError;
      current.similar.updatedAt = new Date().toISOString();
      await saveRun(current);
      return true;
    });
  } catch (e) {
    await failSimilar(
      docId,
      id,
      execution,
      undefined,
      e instanceof Error ? e.message : "Unknown generation error",
    );
    return false;
  }
}
