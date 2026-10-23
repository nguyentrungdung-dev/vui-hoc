import { databaseEnabled, query } from "./database";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { publicDocument, type DocumentJob } from "../lib/documents";
import {
  emptyLearningAttempt,
  isCorrect,
  learningResult,
  runView,
  type LearningRun,
  type LearningView,
} from "../lib/learning";
import { jobDir, lock } from "./store";
import {
  canReadLibraryDocument,
  listLibraryJobs,
  readLibraryJob,
} from "./library";
import { AppError } from "./validation";
import { runActionSchema, startRunRequest } from "./learning-validation";
function runPath(docId: string, id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      id,
    )
  )
    throw new AppError("Không tìm thấy bài làm.", 404);
  return path.join(jobDir(docId), "runs", `${id}.json`);
}
async function saveRun(run: LearningRun) {
  if (databaseEnabled()) {
    run.updatedAt = new Date().toISOString();
    await query(
      `INSERT INTO vuihoc_runs (id, document_id, data) VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now() WHERE vuihoc_runs.document_id = EXCLUDED.document_id`,
      [run.id, run.documentId, JSON.stringify(run)],
    );
    return;
  }
  const target = runPath(run.documentId, run.id);
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = target + "." + randomUUID() + ".tmp";
  run.updatedAt = new Date().toISOString();
  await fs.writeFile(temp, JSON.stringify(run), { mode: 0o600 });
  await fs.rename(temp, target);
}
export async function readRun(docId: string, id: string, viewer: string) {
  runPath(docId, id);
  if (databaseEnabled()) {
    const result = await query<LibraryRunRow>(
      `SELECT r.data, d.owner, d.data->'files' AS files, d.data->'revision' AS revision
       FROM vuihoc_runs r JOIN vuihoc_documents d ON d.id = r.document_id
       WHERE r.id=$1 AND r.document_id=$2`,
      [id, docId],
    );
    const row = result.rows[0];
    if (!row || !canReadLibraryDocument(row, viewer))
      throw new AppError("Không tìm thấy bài làm.", 404);
    return row.data;
  }
  await readLibraryJob(docId, viewer);
  return readRunFile(docId, id);
}
type LibraryRunRow = Pick<DocumentJob, "owner" | "files" | "revision"> & {
  data: LearningRun;
};
async function readRunFile(docId: string, id: string) {
  try {
    const run = JSON.parse(
      await fs.readFile(runPath(docId, id), "utf8"),
    ) as LearningRun;
    if (run.documentId !== docId)
      throw new AppError("Không tìm thấy bài làm.", 404);
    return run;
  } catch {
    throw new AppError("Không tìm thấy bài làm.", 404);
  }
}
export async function listRuns(docId: string, viewer: string) {
  await readLibraryJob(docId, viewer);
  return listDocumentRuns(docId);
}
// Internal only: callers must have checked access to the document in this request.
async function listDocumentRuns(docId: string) {
  if (databaseEnabled()) {
    const result = await query<{ data: LearningRun }>(
      "SELECT data FROM vuihoc_runs WHERE document_id=$1 ORDER BY updated_at DESC",
      [docId],
    );
    return result.rows.map((row) => row.data);
  }
  const files = await fs
    .readdir(path.join(jobDir(docId), "runs"))
    .catch(() => []);
  const runs = await Promise.all(
    files
      .filter((f) => /^[0-9a-f-]{36}\.json$/.test(f))
      .map((f) => readRunFile(docId, f.slice(0, -5)).catch(() => null)),
  );
  return runs
    .filter((r): r is LearningRun => !!r)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function learningHistory(viewer: string) {
  let runs: LearningRun[];
  if (databaseEnabled()) {
    // One round trip; don't transfer document text or learning packs for history.
    const result = await query<LibraryRunRow>(
      `SELECT r.data, d.owner, d.data->'files' AS files, d.data->'revision' AS revision
       FROM vuihoc_runs r JOIN vuihoc_documents d ON d.id = r.document_id`,
    );
    runs = result.rows
      .filter((row) => canReadLibraryDocument(row, viewer))
      .map((row) => row.data);
  } else {
    const jobs = await listLibraryJobs(viewer);
    runs = (
      await Promise.all(jobs.map((job) => listDocumentRuns(job.id)))
    ).flat();
  }
  return runs.map(learningResult).sort((a, b) => b.date.localeCompare(a.date));
}
export async function learningView(
  job: DocumentJob,
  owner: string,
): Promise<LearningView> {
  if (!canReadLibraryDocument(job, owner))
    throw new AppError("Tài liệu chưa tải xong.", 404);
  const p = job.learning;
  return {
    pack: p
      ? {
          id: p.id,
          status: p.status,
          count: p.count,
          topics: p.topics,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          model: p.model,
          message: p.message,
          originalCount: p.parts
            .filter((x) => x.kind === "original")
            .flatMap((x) => x.questions).length,
          practiceCount: p.parts
            .filter((x) => x.kind === "practice")
            .flatMap((x) => x.questions).length,
          completedParts: p.parts.filter((x) => x.done).length,
          totalParts: p.parts.length,
          skipped: p.parts.flatMap((x) => x.skipped),
          errors: p.parts.filter((x) => x.error).map((x) => x.error!),
        }
      : null,
    runs: (await listDocumentRuns(job.id)).map(learningResult),
    sources: publicDocument(job).questions.map(
      ({ id, label, topic, needsReview }) => ({
        id,
        label,
        topic,
        needsReview,
      }),
    ),
  };
}
export async function startLearningRun(
  docId: string,
  owner: string,
  input: unknown,
) {
  const parsed = startRunRequest.safeParse(input);
  if (!parsed.success) throw new AppError("Lựa chọn bài làm chưa hợp lệ.");
  const request = parsed.data;
  return lock(`create-run:${docId}`, async () => {
    const job = await readLibraryJob(docId, owner);
    const pack = job.learning;
    if (!pack) throw new AppError("Hãy tạo bài học trước.");
    if (job.revision && pack.status !== "ready")
      throw new AppError(
        "Chờ bộ ôn tạo đủ câu hỏi và kiểm tra xong trước khi làm bài.",
        409,
      );
    const pool = pack.parts
      .filter((p) => p.done)
      .flatMap((p) => p.questions.map((q) => ({ q, kind: p.kind })));
    let qs = pool
      .filter(
        (x) =>
          x.kind === (request.kind === "original" ? "original" : "practice"),
      )
      .map((x) => x.q);
    if (request.topic) qs = qs.filter((q) => q.topic === request.topic);
    if (request.kind === "similar") {
      const from = pool.find((x) => x.q.id === request.sourceId)?.q;
      if (!from)
        throw new AppError("Không tìm thấy câu nguồn để luyện tương tự.");
      qs = qs
        .filter(
          (q) =>
            q.id !== from.id &&
            (q.topic === from.topic ||
              q.sourceIds.some((s) => from.sourceIds.includes(s))),
        )
        .slice(0, 3);
    }
    if (!qs.length)
      throw new AppError(
        "Chưa có câu đã kiểm tra cho lựa chọn này. Em hãy chọn chủ đề khác hoặc đợi tạo bài xong.",
      );
    if (request.resume) {
      const existing = (await listDocumentRuns(docId)).find(
        (r) =>
          !r.finished &&
          r.packId === pack.id &&
          r.kind === request.kind &&
          JSON.stringify(r.questions.map((q) => q.id)) ===
            JSON.stringify(qs.map((q) => q.id)),
      );
      if (existing) return runView(existing);
    }
    const now = new Date().toISOString();
    const run: LearningRun = {
      id: randomUUID(),
      documentId: docId,
      title: job.title,
      packId: pack.id,
      mode: job.mode,
      kind: request.kind,
      questions: qs,
      attempts: {},
      index: 0,
      finished: false,
      createdAt: now,
      updatedAt: now,
      eventIds: [],
    };
    await saveRun(run);
    return runView(run);
  });
}
export function applyRunAction(
  run: LearningRun,
  input: unknown,
  now = Date.now(),
) {
  const parsed = runActionSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Thao tác bài làm chưa hợp lệ.");
  const action = parsed.data;
  if (run.eventIds.includes(action.eventId)) return;
  if (run.finished)
    throw new AppError(
      "Bài đã kết thúc; hãy mở kết quả hoặc bắt đầu lượt mới.",
      409,
    );
  function closeHints() {
    for (const a of Object.values(run.attempts))
      if (a.hintOpenedAt !== undefined) {
        a.hintMs += Math.max(0, Math.min(now - a.hintOpenedAt, 300000));
        delete a.hintOpenedAt;
      }
  }
  if (action.action === "go") {
    if (action.index === undefined || action.index >= run.questions.length)
      throw new AppError("Câu hỏi không hợp lệ.");
    closeHints();
    run.index = action.index;
  } else if (action.action === "finish") {
    closeHints();
    run.finished = true;
  } else {
    const q = run.questions[run.index];
    if (!q || q.id !== action.questionId)
      throw new AppError("Câu đang làm đã thay đổi. Hãy tải lại bài.", 409);
    const a = run.attempts[q.id] ?? emptyLearningAttempt();
    run.attempts[q.id] = a;
    if (action.action === "answer") {
      if (q.grading === "self_review")
        throw new AppError("Câu mở được tự đối chiếu, không chấm tự động.");
      if (!action.answer)
        throw new AppError("Em nhập hoặc chọn đáp án trước nhé.");
      if (
        q.grading === "choice" &&
        !q.options.some((o) => o.label === action.answer)
      )
        throw new AppError("Chọn một đáp án trong câu hỏi.");
      if (!a.solved) {
        closeHints();
        if (a.first === undefined) {
          a.first = action.answer;
          a.firstCorrect = !a.guided && isCorrect(q, action.answer);
        }
        a.last = action.answer;
        a.tries++;
        a.solved = isCorrect(q, action.answer);
      }
    } else if (action.action === "hint") {
      if (!a.solved && a.hintOpenedAt === undefined) {
        a.hintOpens++;
        a.hintLevel = Math.min(3, a.hintLevel + 1);
        a.hintOpenedAt = now;
      }
    } else if (action.action === "close_hint") closeHints();
    else if (action.action === "guide") {
      closeHints();
      if (!a.solved) a.guided = true;
    } else if (action.action === "understood") {
      if (!a.guided && !a.solved) throw new AppError("Mở hướng dẫn trước nhé.");
      a.solved = true;
    }
  }
  run.eventIds = [...run.eventIds.slice(-1999), action.eventId];
}
export async function changeRun(
  docId: string,
  id: string,
  owner: string,
  input: unknown,
) {
  runPath(docId, id);
  return lock(`run:${docId}:${id}`, async () => {
    const run = await readRun(docId, id, owner);
    applyRunAction(run, input);
    await saveRun(run);
    return runView(run);
  });
}
