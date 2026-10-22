import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeJob, readJob } from "./store";
import { dispatcher, enqueue } from "./dispatch";
import { analyzeBatch, finishAnalysis } from "./analysis";
import { prepareDocument } from "../workflows/steps";
import type { DocumentJob } from "../lib/documents";
const root = mkdtempSync(path.join(os.tmpdir(), "vuihoc-workflow-test-"));
process.env.VUIHOC_DATA_DIR = root;
after(() => fs.rm(root, { recursive: true, force: true }));
function job(): DocumentJob {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    owner: "test",
    title: "Test",
    subject: "math",
    mode: "weekly",
    practiceCount: 25,
    pageRange: "",
    files: [],
    createdAt: now,
    updatedAt: now,
    status: "queued",
    message: "",
    totalPages: 0,
    selectedPages: [],
    completedPages: [],
    batches: [],
    model: "test",
    analysisExecution: randomUUID(),
  };
}
test("Dispatch failure saves retryable status and fences a lost acknowledgement", async () => {
  const j = job();
  await writeJob(j);
  const stub = mock.method(dispatcher, "start", async () => {
    throw Error("queue unavailable");
  });
  try {
    await assert.rejects(enqueue("analysis", j.id, j.analysisExecution!));
    assert.equal((await readJob(j.id)).status, "failed");
    assert.equal((await readJob(j.id)).analysisExecution, undefined);
    await analyzeBatch(j.id, "anything", j.analysisExecution);
    assert.equal((await readJob(j.id)).status, "failed");
  } finally {
    stub.mock.restore();
  }
});
test("An obsolete workflow cannot overwrite a newer execution", async () => {
  const j = job();
  await writeJob(j);
  assert.deepEqual(await prepareDocument(j.id, randomUUID()), []);
  await assert.rejects(finishAnalysis(j.id, randomUUID()));
  assert.equal((await readJob(j.id)).status, "queued");
});
