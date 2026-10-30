import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DocumentJob } from "../lib/documents";
import type { QuickPracticeView } from "../lib/quick-practice";
import { quickPracticeActive } from "../lib/quick-practice";
import { readLibraryJob } from "./library";
import { listJobs, lock, readJob, updateJob, writeJob } from "./store";
import { AppError } from "./validation";
import { enqueue } from "./dispatch";
import { createRevision } from "./revision";
import { preparePack } from "./generation";

const requestSchema = z
  .object({
    requestId: z
      .uuid()
      .refine((id) => id[14] === "4", "Mã yêu cầu chưa hợp lệ."),
    count: z.number().int().min(5).max(50),
  })
  .strict();

export function quickPracticeView(job: DocumentJob): QuickPracticeView {
  const status = job.quickPractice?.waitingForSource
    ? job.status === "failed"
      ? "failed"
      : "waiting_source"
    : job.learning?.status || "failed";
  const stale =
    quickPracticeActive(status) &&
    Date.now() - Date.parse(job.learning?.updatedAt || job.updatedAt) >
      10 * 60 * 1000;
  return {
    id: job.id,
    count: job.practiceCount,
    status: stale ? "failed" : status,
    message: stale
      ? "Tiến trình đề luyện đã gián đoạn. Hãy thử lại phần chưa xong."
      : job.quickPractice?.waitingForSource
        ? job.message
        : job.learning?.message || "Chưa tạo được đề luyện. Hãy thử lại.",
    createdCount:
      job.learning?.parts
        .filter((p) => p.kind === "practice")
        .flatMap((p) => p.questions).length || 0,
    createdAt: job.createdAt,
  };
}

export async function listQuickPractice(sourceId: string, viewer: string) {
  await readLibraryJob(sourceId, viewer);
  return (await listJobs(viewer))
    .filter((j) => j.quickPractice?.sourceDocumentId === sourceId)
    .map(quickPracticeView);
}

export async function requestQuickPractice(
  sourceId: string,
  viewer: string,
  input: unknown,
) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Chọn số câu nguyên từ 5 đến 50.");
  const { requestId, count } = parsed.data;
  const source = await readLibraryJob(sourceId, viewer);
  if (source.revision)
    throw new AppError("Hãy chọn tài liệu gốc để tạo đề luyện.");
  return lock(`document:${requestId}`, async () => {
    let existing: DocumentJob | undefined;
    try {
      existing = await readJob(requestId);
    } catch (e) {
      if (!(e instanceof AppError && e.status === 404)) throw e;
    }
    if (existing) {
      if (
        existing.owner !== viewer ||
        existing.quickPractice?.sourceDocumentId !== sourceId ||
        existing.practiceCount !== count
      )
        throw new AppError(
          "Mã yêu cầu đã được sử dụng. Hãy mở lại cửa sổ tạo đề.",
          409,
        );
      return quickPracticeView(existing);
    }
    const now = new Date().toISOString();
    const job: DocumentJob = {
      id: requestId,
      owner: viewer,
      title: `Đề luyện · ${source.title}`,
      subject: source.subject,
      mode: source.mode,
      practiceCount: count,
      files: [],
      pageRange: "",
      createdAt: now,
      updatedAt: now,
      status: "queued",
      message:
        "Đã nhận yêu cầu. Đề luyện sẽ tự tạo khi nhận diện đủ tài liệu nguồn.",
      totalPages: 0,
      selectedPages: [],
      completedPages: [],
      batches: [],
      model: source.model,
      revision: { kind: "documents", documentIds: [sourceId], sources: [] },
      quickPractice: { sourceDocumentId: sourceId, waitingForSource: true },
      learningExecution: randomUUID(),
    };
    await writeJob(job);
    // Keep the saved request recoverable, including a lost dispatch acknowledgement.
    // enqueue takes the same document lock only on failure, so dispatch after this lock.
    return quickPracticeView(job);
  }).then(async (view) => {
    // The creator alone dispatches. The execution claim is serialized below.
    await dispatchQuickPractice(view.id, viewer);
    return quickPracticeView(await readJob(view.id, viewer));
  });
}

async function dispatchQuickPractice(id: string, viewer: string) {
  const execution = await lock(`quick-practice-dispatch:${id}`, async () => {
    const job = await readJob(id, viewer);
    if (!job.quickPractice || job.quickPractice.dispatched) return null;
    job.quickPractice.dispatched = true;
    job.message =
      "Đang chờ nhận diện đủ tài liệu nguồn. Đề luyện sẽ tự bắt đầu sau đó.";
    await writeJob(job);
    return job.learningExecution!;
  });
  if (execution) await enqueue("quick-practice", id, execution).catch(() => {});
}

/** Durable step: wait for extraction only, never inspect source.learning status. */
export async function prepareQuickPractice(
  id: string,
  execution: string,
): Promise<"waiting" | "ready" | "stop"> {
  return lock(`document:${id}`, async () => {
    const job = await readJob(id);
    if (
      !job.quickPractice ||
      job.learningExecution !== execution ||
      job.status === "failed"
    )
      return "stop";
    if (!job.quickPractice.waitingForSource)
      return job.learning ? "ready" : "stop";
    const source = await readLibraryJob(
      job.quickPractice.sourceDocumentId,
      job.owner,
    );
    if (
      ["uploading", "queued", "preparing", "analyzing"].includes(source.status)
    ) {
      // A sparse heartbeat also lets the UI recover a task lost before dispatch.
      if (Date.now() - Date.parse(job.updatedAt) > 60000) await writeJob(job);
      return "waiting";
    }
    if (
      source.status !== "complete" ||
      !source.selectedPages.length ||
      source.selectedPages.some((p) => !source.completedPages.includes(p))
    ) {
      job.status = "failed";
      job.message =
        "Tài liệu nguồn chưa được nhận diện đủ. Hãy hoàn tất nhận diện rồi thử lại đề luyện.";
      await writeJob(job);
      return "stop";
    }
    try {
      await createRevision(
        job.owner,
        {
          kind: "documents",
          subject: source.subject,
          documentIds: [source.id],
          count: job.practiceCount,
        },
        job,
      );
      return "ready";
    } catch (e) {
      job.status = "failed";
      job.message =
        e instanceof AppError
          ? e.message
          : "Chưa chuẩn bị được nguồn cho đề luyện. Hãy thử lại.";
      await writeJob(job);
      return "stop";
    }
  });
}

export async function failQuickPractice(
  id: string,
  execution: string,
  message = "Tạo đề luyện bị gián đoạn. Phần đã xong được giữ lại; hãy thử lại.",
) {
  await updateJob(id, (j) => {
    if (!j.quickPractice || j.learningExecution !== execution) return;
    if (j.quickPractice.waitingForSource) {
      j.status = "failed";
      j.message = message;
    } else if (
      j.learning &&
      ["queued", "generating"].includes(j.learning.status)
    ) {
      j.learning.status = j.learning.parts.some((p) => p.questions.length)
        ? "partial"
        : "failed";
      j.learning.message = message;
    }
  });
}

export async function retryQuickPractice(
  sourceId: string,
  id: string,
  viewer: string,
) {
  await readLibraryJob(sourceId, viewer);
  const job = await updateJob(
    id,
    (j) => {
      if (j.owner !== viewer || j.quickPractice?.sourceDocumentId !== sourceId)
        throw new AppError("Không tìm thấy đề luyện.", 404);
      const view = quickPracticeView(j);
      if (quickPracticeActive(view.status) || view.status === "ready")
        throw new AppError("Đề luyện đang xử lý hoặc đã sẵn sàng.", 409);
      if (j.quickPractice.waitingForSource) {
        j.status = "queued";
        j.message = "Đang chờ nhận diện đủ tài liệu nguồn.";
      } else
        j.learning = preparePack(j, {
          count: j.practiceCount,
          topics: j.learning?.topics || [],
          retry: true,
        });
      j.learningExecution = randomUUID();
      j.quickPractice.dispatched = true;
    },
    viewer,
  );
  await enqueue("quick-practice", job.id, job.learningExecution!).catch(
    () => {},
  );
  return quickPracticeView(await readJob(id, viewer));
}
