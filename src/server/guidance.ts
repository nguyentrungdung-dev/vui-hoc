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
import {
  createCarryLesson,
  assembleLesson,
  alignMotion,
  transcribeMotion,
} from "./guidance-motion";
import {
  createStory,
  storySource,
  chooseSticker,
  storyAsMotion,
  storyVisuals,
  storyVersion,
} from "./guidance-story";
import { trimQuiet } from "./guidance-motion/audio-postprocess.mjs";
import { createScenes } from "./guidance-ai";
import { synthesizeSpeech, speechConfig, speechInputVersion } from "./speech";
import {
  guidanceLock,
  readGuidance,
  writeGuidance,
  updateGuidance,
  type GuidanceJob,
} from "./guidance-store";

const version = storyVersion;
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
    hasFigure: q.hasFigure,
    figureDescription: q.figureDescription,
    topic: q.topic,
  });
  return {
    scripts,
    prompt,
    sourceHash,
    motionTemplate: "lesson-v3" as const,
    storySource: storySource(q),
  };
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
    ...(job.status === "ready" && job.motion ? { motion: job.motion } : {}),
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
      sticker: chooseSticker(),
      speechInputVersion,
      scenes: null,
      audio: source.scripts.map(() => null),
      status: "queued",
      message: "Đang chuẩn bị hướng dẫn…",
      execution,
      generationStartedAt: Date.now(),
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
  const source = guidanceSource(q);
  const legacyHash = hash({
    questionId: q.id,
    prompt: source.prompt,
    steps: q.steps,
    explanation: q.explanation,
    answer: q.answer,
    options: q.options,
  });
  if (
    source.sourceHash !== job.sourceHash &&
    !(job.config.version !== storyVersion && legacyHash === job.sourceHash)
  )
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
  if (job.motionTemplate === "lesson-v3") {
    if (job.story && job.speechInputVersion !== speechInputVersion) {
      await updateGuidance(docId, id, execution, (j) => {
        j.rawAudio = j.audio;
        j.audio = j.scripts.map(() => null);
        j.speechInputVersion = speechInputVersion;
        j.narrationRevision = (j.narrationRevision ?? 0) + 1;
        delete j.motionPrepared;
        delete j.wordTimestamps;
        delete j.motion;
      });
    }
    if (!job.story) {
      if (!job.storySource)
        throw new AppError("Thiếu nguồn lời giải để tạo kịch bản.");
      const story = await createStory(job.storySource, job.config.model);
      await updateGuidance(docId, id, execution, (j) => {
        j.story = story;
        j.speechInputVersion = speechInputVersion;
        j.lesson = storyAsMotion(story);
        j.scripts = story.segments.map((s) => s.narration);
        j.scenes = j.scripts.map(() => ({ tiles: [] }));
        j.audio = j.scripts.map(() => null);
        j.sticker ??= chooseSticker();
      });
      return story.segments.length;
    }
    return job.scripts.length;
  }
  if (job.motionTemplate) {
    if (!job.lesson) {
      const lesson = await createCarryLesson(
        job.prompt,
        job.scripts,
        job.config.model,
      );
      await updateGuidance(docId, id, execution, (j) => {
        j.lesson = lesson;
        j.scripts = lesson.segments.map((s) => s.narration);
        j.scenes = j.scripts.map(() => ({ tiles: [] }));
        j.audio = j.scripts.map(() => null);
      });
      return lesson.segments.length;
    }
    return job.scripts.length;
  }
  // Compatibility for already-dispatched historical jobs only. Every new
  // request above is versioned lesson-v3, regardless of subject or question.
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
  const asset = await saveAudio(
    docId,
    id,
    execution,
    `${job.narrationRevision ?? 0}-${index}`,
    bytes,
  );
  await updateGuidance(docId, id, execution, (j) => {
    if ((j.narrationRevision ?? 0) === (job.narrationRevision ?? 0))
      j.audio[index] = asset;
  });
  return true;
}
async function saveAudio(
  docId: string,
  id: string,
  execution: string,
  name: string,
  bytes: Buffer,
) {
  const relative = `guidance/${docId}/${id}/${execution}/${name}.wav`;
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
  return { path: relative, storage, size: bytes.length };
}
async function readAudio(
  docId: string,
  asset: NonNullable<GuidanceJob["audio"][number]>,
) {
  if (asset.storage === "local")
    return fs.readFile(path.join(jobDir(docId), asset.path));
  const file = await guidanceStorage.get(asset.path, {
    access: "private",
    abortSignal: AbortSignal.timeout(30000),
  });
  if (!file || file.statusCode !== 200)
    throw new AppError("Chưa đọc được âm thanh để căn lời.", 502);
  return Buffer.from(await new Response(file.stream).arrayBuffer());
}
export async function finishGuidance(
  docId: string,
  id: string,
  execution: string,
) {
  let job = await readGuidance(docId, id);
  if (
    !job ||
    job.execution !== execution ||
    job.status === "failed" ||
    job.status === "ready"
  )
    return;
  if (!job.scenes || job.audio.some((a) => !a))
    throw new AppError("Hướng dẫn chưa tạo đủ. Em hãy thử lại.");
  if (job.motionTemplate && job.lesson && !job.motion) {
    await updateGuidance(docId, id, execution, (j) => {
      j.message = "Đang căn chuyển động theo lời đọc…";
    });
    if (!job.motionPrepared) {
      const raw = await Promise.all(job.audio.map((a) => readAudio(docId, a!)));
      let assembled: ReturnType<typeof assembleLesson>;
      try {
        const cleanSeconds = raw.reduce(
          (n, wav) => n + trimQuiet(wav).seconds,
          0,
        );
        const targetSeconds = Math.min(50, cleanSeconds + raw.length * 2);
        if (targetSeconds < 45) throw new Error("Narration too short");
        assembled = assembleLesson(raw, { targetSeconds });
      } catch {
        if (job.storySource && (job.narrationRevision ?? 0) < 1) {
          const seconds = raw.reduce((n, wav) => n + trimQuiet(wav).seconds, 0);
          const story = await createStory(
            job.storySource,
            job.config.model,
            `Giọng đọc thực tế dài ${seconds.toFixed(1)} giây. ${seconds > 55 ? "Rút lời còn 80–90 tiếng, bỏ lời lặp để giữ đủ bước trong 50 giây." : "Giải thích rõ hơn vì sao và kiểm tra kết quả, khoảng 105–110 tiếng, không thêm dữ kiện."}`,
          );
          await updateGuidance(docId, id, execution, (j) => {
            j.rawAudio = j.audio;
            j.story = story;
            j.lesson = storyAsMotion(story);
            j.scripts = story.segments.map((s) => s.narration);
            j.scenes = j.scripts.map(() => ({ tiles: [] }));
            j.audio = j.scripts.map(() => null);
            j.narrationRevision = (j.narrationRevision ?? 0) + 1;
            delete j.wordTimestamps;
            delete j.motionPrepared;
          });
          for (let i = 0; i < story.segments.length; i += 3) {
            const done = await Promise.all(
              Array.from(
                { length: Math.min(3, story.segments.length - i) },
                (_, k) => createGuidanceAudio(docId, id, i + k, execution),
              ),
            );
            if (done.some((x) => !x)) return;
          }
          await finishGuidance(docId, id, execution);
          return;
        }
        // Clips outside the duration contract must not trap every retry on the
        // same invalid audio. Keep the rejected assets for diagnosis only.
        await updateGuidance(docId, id, execution, (j) => {
          j.rawAudio = j.audio;
          j.audio = j.scripts.map(() => null);
          delete j.wordTimestamps;
        });
        throw new AppError(
          "Lời đọc chưa đạt thời lượng khoảng 50 giây. Em có thể xem lời giải chữ và thử lại.",
          502,
        );
      }
      const audio: GuidanceJob["audio"] = [];
      for (const [i, clip] of assembled.clips.entries())
        audio.push(
          await saveAudio(docId, id, execution, `clean-${i}`, clip.wav),
        );
      const combined = await saveAudio(
        docId,
        id,
        execution,
        "aligned",
        assembled.wav,
      );
      const clips = assembled.clips.map((c, i) => ({
        start: c.start,
        end: c.end,
        seconds: c.seconds,
        narration: job!.scripts[i],
      }));
      await updateGuidance(docId, id, execution, (j) => {
        j.rawAudio = j.audio;
        j.motionPrepared = {
          audio,
          combined,
          clips,
          duration: assembled.duration,
          removedSilenceSeconds: assembled.removedSilenceSeconds,
        };
      });
      job = (await readGuidance(docId, id))!;
      if (job.execution !== execution || !job.motionPrepared) return;
    }
    const prepared = job.motionPrepared;
    const wav = await readAudio(docId, prepared.combined);
    let words =
      job.wordTimestamps ??
      (await transcribeMotion(
        wav,
        job.story ? job.scripts.join(" ") : undefined,
      ));
    if (!job.wordTimestamps)
      await updateGuidance(docId, id, execution, (j) => {
        j.wordTimestamps = words;
      });
    let events;
    try {
      events = alignMotion(job.lesson!, prepared.clips, words);
    } catch (error) {
      // Retrying alignment reuses TTS but must be able to replace a bad ASR result.
      await updateGuidance(docId, id, execution, (j) => {
        delete j.wordTimestamps;
      });
      if (job.motionTemplate !== "lesson-v3") throw error;
      // Recover from a hallucinated whole-file transcript by recognizing each
      // actual processed clip separately. Use returned word times, never guesses.
      const localWords: { word: string; start: number; end: number }[] = [];
      for (let i = 0; i < prepared.audio.length; i += 3) {
        const batch = await Promise.all(
          Array.from(
            { length: Math.min(3, prepared.audio.length - i) },
            async (_, k) => {
              const index = i + k;
              const bytes = await readAudio(docId, prepared.audio[index]!);
              const recognized = await transcribeMotion(
                bytes,
                job!.scripts[index],
                "openai/whisper-1",
              );
              return recognized.map((w) => ({
                ...w,
                start: w.start + prepared.clips[index].start,
                end: w.end + prepared.clips[index].start,
              }));
            },
          ),
        );
        localWords.push(...batch.flat());
      }
      words = localWords;
      events = alignMotion(job.lesson!, prepared.clips, words);
      await updateGuidance(docId, id, execution, (j) => {
        j.wordTimestamps = words;
      });
    }
    await updateGuidance(docId, id, execution, (j) => {
      j.audio = prepared.audio;
      j.motion = {
        template:
          j.motionTemplate === "lesson-v3" ? "lesson-v3" : "carry-45-38",
        ...(j.story
          ? {
              title: j.story.title,
              visuals: storyVisuals(j.story, j.storySource),
              sticker: j.sticker,
            }
          : {}),
        duration: prepared.duration,
        events,
        clips: prepared.clips,
      };
    });
  }
  await updateGuidance(docId, id, execution, (j) => {
    if (j.motionTemplate && !j.motion)
      throw new AppError("Chuyển động chưa được kiểm tra.");
    j.status = "ready";
    j.generationSeconds = j.generationStartedAt
      ? (Date.now() - j.generationStartedAt) / 1000
      : undefined;
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
