import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { databaseEnabled, query } from "./database";
import { jobDir, lock } from "./store";
import { AppError } from "./validation";
import type {
  MotionScene,
  GuidanceView,
  MotionLesson,
  GuidanceMotion,
} from "../lib/guidance";

export type GuidanceJob = {
  id: string;
  documentId: string;
  questionId: string;
  sourceHash: string;
  motionTemplate?: "carry-45-38";
  lesson?: MotionLesson;
  motion?: GuidanceMotion;
  rawAudio?: GuidanceJob["audio"];
  motionPrepared?: {
    clips: GuidanceMotion["clips"];
    audio: GuidanceJob["audio"];
    combined: NonNullable<GuidanceJob["audio"][number]>;
    duration: number;
    removedSilenceSeconds: number;
  };
  wordTimestamps?: { word: string; start: number; end: number }[];
  generationStartedAt?: number;
  generationSeconds?: number;
  prompt: string;
  scripts: string[];
  config: {
    model: string;
    ttsModel: string;
    ttsInstructions?: string; // absent on historical speech jobs
    voice: string;
    version: string;
  };
  status: GuidanceView["status"];
  message: string;
  execution: string;
  scenes: MotionScene[] | null;
  audio: ({ path: string; size: number; storage: "blob" | "local" } | null)[];
  updatedAt: string;
};
export function guidancePath(docId: string, id: string) {
  if (!/^[a-f0-9]{64}$/.test(id))
    throw new AppError("Không tìm thấy hướng dẫn.", 404);
  return path.join(jobDir(docId), "guidance", `${id}.json`);
}
export async function readGuidance(
  docId: string,
  id: string,
): Promise<GuidanceJob | null> {
  const target = guidancePath(docId, id);
  if (databaseEnabled()) {
    const result = await query<{ data: GuidanceJob }>(
      "SELECT data FROM vuihoc_guidance WHERE id=$1 AND document_id=$2",
      [id, docId],
    );
    return result.rows[0]?.data ?? null;
  }
  try {
    return JSON.parse(await fs.readFile(target, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
export async function writeGuidance(job: GuidanceJob) {
  const target = guidancePath(job.documentId, job.id);
  job.updatedAt = new Date().toISOString();
  if (databaseEnabled()) {
    await query(
      `INSERT INTO vuihoc_guidance (id, document_id, data) VALUES ($1,$2,$3::jsonb)
      ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()
      WHERE vuihoc_guidance.document_id=EXCLUDED.document_id`,
      [job.id, job.documentId, JSON.stringify(job)],
    );
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(job), { mode: 0o600 });
  await fs.rename(temp, target);
}
export function guidanceLock<T>(
  docId: string,
  id: string,
  fn: () => Promise<T>,
) {
  guidancePath(docId, id);
  return lock(`guidance:${docId}:${id}`, fn);
}
export async function updateGuidance(
  docId: string,
  id: string,
  execution: string,
  fn: (job: GuidanceJob) => void,
) {
  return guidanceLock(docId, id, async () => {
    const job = await readGuidance(docId, id);
    if (!job || job.execution !== execution) return;
    fn(job);
    await writeGuidance(job);
  });
}
