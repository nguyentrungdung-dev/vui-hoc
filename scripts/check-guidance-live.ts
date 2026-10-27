/** Explicit smoke test: calls the configured Claude and TTS models once for a
 * disposable sample lesson. Never reads/writes the application's database. */
import { loadEnvConfig } from "@next/env";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DocumentJob } from "../src/lib/documents";
import type { LearningQuestion } from "../src/lib/learning";
import { writeJob } from "../src/server/store";
import { startLearningRun } from "../src/server/learning-runs";
import { guidanceDispatcher, requestGuidance } from "../src/server/guidance";
import { readGuidance } from "../src/server/guidance-store";
import { generateGuidanceWorkflow } from "../src/workflows/guidance";

async function main() {
  loadEnvConfig(process.cwd());
  delete process.env.DATABASE_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  Object.assign(process.env, { NODE_ENV: "development" });
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "vuihoc-guidance-live-"),
  );
  process.env.VUIHOC_DATA_DIR = root;
  const q: LearningQuestion = {
    id: "sample-addition",
    contentVersion: 2,
    sourceIds: [],
    sourcePages: [1],
    topic: "Cộng có nhớ",
    label: "Câu mẫu",
    prompt: "Kết quả của phép tính cộng 45 + 38 là:",
    passage: "",
    options: [
      { label: "A", text: "73" },
      { label: "B", text: "81" },
      { label: "C", text: "83" },
      { label: "D", text: "85" },
    ],
    hasFigure: false,
    figureDescription: "",
    advanced: false,
    translation: "",
    grading: "choice",
    answer: "C",
    acceptedAnswers: [],
    hints: [
      "Cộng hàng đơn vị trước nhé.",
      "Nhớ một chục khi tổng đơn vị lớn hơn chín.",
      "Cộng thêm số nhớ vào hàng chục.",
    ],
    steps: [
      "Bước 1: Cộng hàng đơn vị: 5 + 8 = 13. Viết 3, nhớ 1 chục.",
      "Bước 2: Cộng hàng chục: 4 + 3 + 1 (số nhớ) = 8 chục. Kết quả là 83, chọn C.",
    ],
    explanation:
      "Vì 5 đơn vị cộng 8 đơn vị được 13 đơn vị, tức là 1 chục và 3 đơn vị, nên phải nhớ 1 chục. Hàng chục là 4 + 3 + 1 = 8 chục, do đó kết quả là 83.",
    englishSteps: [],
    checks: [],
  };
  const now = new Date().toISOString();
  const job: DocumentJob = {
    id: randomUUID(),
    owner: "sample-owner",
    title: "Kiểm tra hướng dẫn — 45 + 38",
    subject: "math",
    mode: "weekly",
    practiceCount: 5,
    pageRange: "",
    files: [
      { name: "sample.pdf", mime: "application/pdf", size: 10, uploaded: true },
    ],
    storage: "local",
    createdAt: now,
    updatedAt: now,
    status: "complete",
    message: "",
    totalPages: 1,
    selectedPages: [1],
    completedPages: [1],
    batches: [],
    model: process.env.OPENROUTER_MODEL || "",
    learning: {
      id: randomUUID(),
      status: "ready",
      count: 1,
      topics: [],
      createdAt: now,
      updatedAt: now,
      model: "sample",
      message: "",
      parts: [
        {
          key: "sample",
          kind: "original",
          sourceIds: [],
          count: 1,
          done: true,
          questions: [q],
          skipped: [],
        },
      ],
    },
  };
  await writeJob(job);
  const run = await startLearningRun(job.id, "sample-viewer", {
    kind: "original",
    resume: false,
  });
  let dispatches = 0;
  let pending: [string, string, string] | undefined;
  guidanceDispatcher.start = async (...args) => {
    dispatches++;
    pending = args;
  };
  const startedAt = Date.now();
  const result = await requestGuidance(job.id, run.id, "sample-viewer", {
    questionId: q.id,
  });
  if (!pending) throw new Error("Expected one queued generation");
  console.log("Creating scenes and speech for one disposable sample…");
  await generateGuidanceWorkflow(...pending);
  const saved = (await readGuidance(job.id, result.guidance.id))!;
  const info = {
    root,
    documentId: job.id,
    runId: run.id,
    guidanceId: saved.id,
    status: saved.status,
    message: saved.message,
    scenes: saved.scenes,
    motion: saved.motion,
    removedSilenceSeconds: saved.motionPrepared?.removedSilenceSeconds,
    completedAudio: saved.audio.filter(Boolean).length,
    elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
  };
  await fs.writeFile(
    "/tmp/vuihoc-guidance-live-info.json",
    JSON.stringify(info, null, 2),
  );
  console.log(
    JSON.stringify({
      root,
      documentId: job.id,
      runId: run.id,
      status: saved.status,
      message: saved.message,
      completedAudio: info.completedAudio,
      elapsedSeconds: info.elapsedSeconds,
    }),
  );
  if (saved.status !== "ready") throw new Error(saved.message);
  const cached = await requestGuidance(job.id, run.id, "sample-viewer", {
    questionId: q.id,
  });
  if (cached.guidance.status !== "ready" || dispatches !== 1)
    throw new Error("Cache reuse failed");
  console.log(
    "PASS: live scenes + speech + persisted cache reuse; no second generation.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
