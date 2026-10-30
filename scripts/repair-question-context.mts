// Targeted, verified pack repair. Never changes source batches or saved runs.
import env from "@next/env";
import { Pool } from "pg";
import { readFileSync, writeFileSync } from "node:fs";
import { publicDocument, type DocumentJob } from "../src/lib/documents";
import { validateTeaching } from "../src/server/learning-validation";
import type { LearningPart } from "../src/lib/learning";
env.loadEnvConfig(process.cwd());
const audited = JSON.parse(
  readFileSync(".test-data/question-context-audit/source.json", "utf8"),
) as DocumentJob;
const verified = JSON.parse(
  readFileSync(".test-data/question-context-audit/verified-part.json", "utf8"),
) as LearningPart;
const checked = verified.questions.find((q) => q.id === "pages-1-2-3");
if (
  !checked ||
  checked.grading !== "self_review" ||
  checked.answerFields?.length !== 10
)
  throw new Error("A fully verified ten-field question is required.");
validateTeaching(checked, [2, 3], [checked.id], false);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const result = await client.query(
    "SELECT data FROM vuihoc_documents WHERE id=$1 FOR UPDATE",
    [audited.id],
  );
  const job = result.rows[0]?.data as DocumentJob;
  if (
    !job?.learning ||
    job.learning.id !== audited.learning?.id ||
    ["queued", "generating"].includes(job.learning.status)
  )
    throw new Error("Pack changed or is still running; inspect again.");
  const doc = publicDocument(job);
  const source = doc.questions.find((q) => q.id === checked.id);
  const auditSource = publicDocument(audited).questions.find(
    (q) => q.id === checked.id,
  );
  if (
    !source ||
    JSON.stringify(source) !== JSON.stringify(auditSource) ||
    JSON.stringify(source.answerFields) !== JSON.stringify(checked.answerFields)
  )
    throw new Error("Verified source no longer matches.");
  const ids = new Set(doc.questions.map((q) => q.id));
  const removed = job.learning.parts
    .filter((p) => p.kind === "original")
    .flatMap((p) => p.questions)
    .filter((q) => !ids.has(q.id));
  if (
    removed.length !== 7 ||
    !removed.every((q) => /^pages-3-4-[0-6]$/.test(q.id))
  )
    throw new Error("Unexpected removed questions; no write allowed.");
  writeFileSync(
    ".test-data/question-context-audit/before-pack-repair.json",
    JSON.stringify(job, null, 2),
    { mode: 0o600 },
  );
  for (const part of job.learning.parts.filter((p) => p.kind === "original")) {
    part.questions = part.questions
      .filter((q) => ids.has(q.id))
      .map((q) => (q.id === checked.id ? checked : q));
    part.sourceIds = part.sourceIds.filter((id) => ids.has(id));
    part.count = part.sourceIds.length;
    part.skipped = part.skipped.filter((q) => ids.has(q.sourceId));
  }
  job.learning.updatedAt = new Date().toISOString();
  job.learning.reviewNotes = [
    ...(job.learning.reviewNotes || []),
    "Khôi phục Bài 4: ghép 7 mảnh tiếp trang vào đủ 10 ý; giải và kiểm định lại toàn bài. Giữ nguyên mọi lượt làm cũ.",
  ];
  if (process.argv.includes("--apply"))
    await client.query(
      "UPDATE vuihoc_documents SET data=$2::jsonb WHERE id=$1",
      [job.id, JSON.stringify(job)],
    );
  await client.query(process.argv.includes("--apply") ? "COMMIT" : "ROLLBACK");
  console.log(
    JSON.stringify({
      applied: process.argv.includes("--apply"),
      documentId: job.id,
      originals: job.learning.parts
        .filter((p) => p.kind === "original")
        .flatMap((p) => p.questions).length,
      repairedFields: checked.answerFields.length,
      savedRunsChanged: 0,
    }),
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
