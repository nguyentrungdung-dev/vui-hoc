import { createHash, randomUUID } from "node:crypto";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { put, get } from "@vercel/blob";
import type { LearningQuestion, LearningRun } from "../lib/learning";
import type { GuidanceResponse, GuidanceView } from "../lib/guidance";
import { readRun, changeRun } from "./learning-runs";
import { modelName } from "./analysis";
import { storageMode, requireStorage } from "./source-files";
import { jobDir } from "./store";
import { AppError } from "./validation";
import { createScenes } from "./guidance-ai";
import { synthesizeSpeech, speechConfig } from "./speech";
import {
  guidanceLock,
  readGuidance,
  writeGuidance,
  updateGuidance,
  type GuidanceJob,
} from "./guidance-store";

const version = "motion-v1-gemini-aoede-pcm24-v1";
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const guidanceStorage = { put, get };
export const guidanceDispatcher = {
  async start(docId: string, id: string, execution: string) {
    const { start } = await import("workflow/api");
    const { generateGuidanceWorkflow } = await import("../workflows/guidance");
    await start(generateGuidanceWorkflow, [docId, id, execution]);
  },
};
export function guidanceConfig() {
  if (!process.env.OPENROUTER_API_KEY?.trim())
    throw new AppError("Chưa cấu hình OpenRouter cho cảnh hướng dẫn.", 503);
  const speech = speechConfig();
  requireStorage();
  return {
    model: modelName(),
    ttsModel: speech.model,
    voice: speech.voice,
    ttsInstructions: speech.instructions,
    version,
  };
}
export function guidanceSource(q: LearningQuestion) {
  // Include explanation as its own scene. Never feed short hints in place of full steps.
  const scripts = [...q.steps, q.explanation]
    .filter((s) => s.trim().length > 0)
    .flatMap((text) => {
      const parts: string[] = [];
      let rest = text;
      while (rest.length > 1800) {
        let cut = rest.lastIndexOf(" ", 1800);
        if (cut < 1) cut = 1800;
        parts.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      if (rest.trim()) parts.push(rest);
      return parts;
    });
  if (!scripts.length || scripts.length > 48)
    throw new AppError(
      "Lời giải chưa đủ hoặc quá dài để tạo hướng dẫn. Em có thể xem lời giải chữ.",
      422,
    );
  const prompt = [q.prompt, q.passage].filter(Boolean).join("\n");
  const sourceHash = hash({
    questionId: q.id,
    prompt,
    steps: q.steps,
    explanation: q.explanation,
    answer: q.answer,
    options: q.options,
  });
  return { scripts, prompt, sourceHash };
}
function question(run: LearningRun, questionId: string) {
  const q = run.questions.find((q) => q.id === questionId);
  if (!q) throw new AppError("Không tìm thấy câu hỏi.", 404);
  return q;
}
export function guidanceView(job: GuidanceJob, runId: string): GuidanceView {
  return {
    id: job.id,
    status:
      ["queued", "generating"].includes(job.status) &&
      Date.now() - Date.parse(job.updatedAt) > 30 * 60 * 1000
        ? "failed"
        : job.status,
    message:
      ["queued", "generating"].includes(job.status) &&
      Date.now() - Date.parse(job.updatedAt) > 30 * 60 * 1000
        ? "Tác vụ bị gián đoạn. Em hãy thử lại để tiếp tục."
        : job.message,
    completed: job.audio.filter(Boolean).length,
    total: job.scripts.length,
    prompt: job.prompt,
    segments: job.scripts.map((text, i) => ({
      text,
      scene: job.scenes?.[i] ?? null,
      audioUrl:
        job.status === "ready" && job.audio[i]
          ? `/api/documents/${job.documentId}/runs/${runId}/guidance/${job.id}/${i}`
          : null,
    })),
  };
}
export async function requestGuidance(
  docId: string,
  runId: string,
  viewer: string,
  input: unknown,
): Promise<GuidanceResponse> {
  if (
    !input ||
    typeof input !== "object" ||
    !("questionId" in input) ||
    typeof input.questionId !== "string" ||
    ("retry" in input && typeof input.retry !== "boolean")
  )
    throw new AppError("Lựa chọn hướng dẫn chưa hợp lệ.");
  const run = await readRun(docId, runId, viewer);
  if (run.finished)
    throw new AppError(
      "Bài đã kết thúc; hãy bắt đầu lượt mới để xem hướng dẫn.",
      409,
    );
  const q = question(run, input.questionId);
  if (run.questions[run.index]?.id !== q.id)
    throw new AppError("Câu đang làm đã thay đổi. Hãy mở lại câu hỏi.", 409);
  const source = guidanceSource(q);
  const config = guidanceConfig();
  const id = hash({ docId, sourceHash: source.sourceHash, config });
  // Record full-solution exposure before returning any scene/script, including cache hits.
  const nextRun = await changeRun(docId, runId, viewer, {
    action: "guide",
    questionId: q.id,
    eventId: randomUUID(),
  });
  const claimed = await guidanceLock(docId, id, async () => {
    const existing = await readGuidance(docId, id);
    const stale =
      existing && Date.now() - Date.parse(existing.updatedAt) > 30 * 60 * 1000;
    if (
      existing &&
      (existing.status === "ready" ||
        (!stale && existing.status !== "failed") ||
        !("retry" in input && input.retry))
    )
      return { job: existing, start: false };
    const execution = randomUUID();
    const job: GuidanceJob = existing ?? {
      id,
      documentId: docId,
      questionId: q.id,
      ...source,
      config,
      scenes: null,
      audio: source.scripts.map(() => null),
      status: "queued",
      message: "Đang chuẩn bị hướng dẫn…",
      execution,
      updatedAt: new Date().toISOString(),
    };
    job.execution = execution;
    job.status = "queued";
    job.message = "Đang chuẩn bị hướng dẫn…";
    await writeGuidance(job);
    return { job, start: true };
  });
  if (claimed.start) {
    try {
      await guidanceDispatcher.start(docId, id, claimed.job.execution);
    } catch {
      await failGuidance(
        docId,
        id,
        claimed.job.execution,
        new AppError(
          "Chưa khởi động được tạo hướng dẫn. Em hãy nhấn Thử lại.",
          503,
        ),
      );
    }
  }
  return {
    run: nextRun,
    guidance: guidanceView((await readGuidance(docId, id))!, runId),
  };
}
export async function authorizedGuidance(
  docId: string,
  runId: string,
  viewer: string,
  id: string,
) {
  const run = await readRun(docId, runId, viewer);
  const job = await readGuidance(docId, id);
  if (!job) throw new AppError("Không tìm thấy hướng dẫn.", 404);
  const q = question(run, job.questionId);
  if (guidanceSource(q).sourceHash !== job.sourceHash)
    throw new AppError("Lời giải đã thay đổi. Em hãy tạo lại hướng dẫn.", 409);
  const attempt = run.attempts[q.id];
  if (!run.finished && !attempt?.guided && !attempt?.solved)
    throw new AppError("Mở hướng dẫn cho câu này trước nhé.", 403);
  return job;
}
export async function failGuidance(
  docId: string,
  id: string,
  execution: string,
  error?: unknown,
) {
  await updateGuidance(docId, id, execution, (job) => {
    if (job.status === "ready") return;
    job.status = "failed";
    job.message =
      error instanceof AppError
        ? error.message
        : "Tạo hướng dẫn bị gián đoạn. Phần đã xong được giữ lại; em hãy thử lại.";
    // Fence an old workflow, including ambiguous dispatch acknowledgements.
    job.execution = randomUUID();
  });
}
export async function prepareGuidance(
  docId: string,
  id: string,
  execution: string,
) {
  const job = await readGuidance(docId, id);
  if (
    !job ||
    job.execution !== execution ||
    job.status === "ready" ||
    job.status === "failed"
  )
    return 0;
  await updateGuidance(docId, id, execution, (j) => {
    j.status = "generating";
    j.message = "Đang tạo cảnh minh họa…";
  });
  if (!job.scenes) {
    const scenes = await createScenes(
      job.prompt,
      job.scripts,
      job.config.model,
    );
    await updateGuidance(docId, id, execution, (j) => {
      j.scenes = scenes;
    });
  }
  return job.scripts.length;
}
export async function createGuidanceAudio(
  docId: string,
  id: string,
  index: number,
  execution: string,
) {
  const job = await readGuidance(docId, id);
  if (!job || job.execution !== execution || job.status === "failed")
    return false;
  if (job.audio[index]) return true;
  if (
    !job.scenes ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= job.scripts.length
  )
    throw new AppError("Thiếu cảnh hướng dẫn.");
  await updateGuidance(docId, id, execution, (j) => {
    j.message = `Đang tạo giọng đọc ${index + 1}/${j.scripts.length}…`;
  });
  const bytes = await synthesizeSpeech(
    job.scripts[index],
    job.config.ttsModel,
    job.config.voice,
    job.config.ttsInstructions,
  );
  // Execution-specific paths prevent an obsolete worker from overwriting a later retry.
  const relative = `guidance/${docId}/${id}/${execution}/${index}.wav`;
  const storage = storageMode();
  if (storage === "blob") {
    await guidanceStorage.put(relative, bytes, {
      access: "private",
      contentType: "audio/wav",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    const target = path.join(jobDir(docId), relative);
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    const temp = `${target}.${randomUUID()}.tmp`;
    await fs.writeFile(temp, bytes, { mode: 0o600 });
    await fs.rename(temp, target);
  }
  await updateGuidance(docId, id, execution, (j) => {
    j.audio[index] = { path: relative, storage, size: bytes.length };
  });
  return true;
}
export async function finishGuidance(
  docId: string,
  id: string,
  execution: string,
) {
  await updateGuidance(docId, id, execution, (j) => {
    if (!j.scenes || j.audio.some((a) => !a))
      throw new AppError("Hướng dẫn chưa tạo đủ. Em hãy thử lại.");
    j.status = "ready";
    j.message = "Hướng dẫn đã sẵn sàng.";
  });
}
export async function openGuidanceAudio(job: GuidanceJob, index: number) {
  const asset = job.audio[index];
  if (job.status !== "ready" || !asset)
    throw new AppError("Giọng đọc chưa sẵn sàng.", 404);
  if (asset.storage === "blob") {
    const file = await guidanceStorage.get(asset.path, {
      access: "private",
      abortSignal: AbortSignal.timeout(30000),
    });
    if (!file || file.statusCode !== 200)
      throw new AppError("Chưa đọc được giọng hướng dẫn. Em hãy thử lại.", 502);
    return file.stream;
  }
  if (storageMode() !== "local")
    throw new AppError("Không tìm thấy âm thanh trên kho đám mây.", 404);
  return Readable.toWeb(
    createReadStream(path.join(jobDir(job.documentId), asset.path)),
  ) as ReadableStream<Uint8Array>;
}

export function audioByteRange(header: string | null, size: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]))
    throw new AppError("Khoảng âm thanh không hợp lệ.", 416);
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end =
    match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    throw new AppError("Khoảng âm thanh không hợp lệ.", 416);
  return { start, end };
}
export function sliceAudio(
  stream: ReadableStream<Uint8Array>,
  start: number,
  end: number,
) {
  const reader = stream.getReader();
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          const base = offset;
          offset += value.length;
          if (offset <= start) continue;
          const from = Math.max(0, start - base);
          const until = Math.min(value.length, end + 1 - base);
          if (until > from) controller.enqueue(value.subarray(from, until));
          if (offset > end) {
            controller.close();
            await reader.cancel();
          }
          return;
        }
      } catch (error) {
        controller.error(error);
        await reader.cancel().catch(() => {});
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
