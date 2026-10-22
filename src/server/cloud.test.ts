import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { closeDatabase, query } from "./database";
import { readJob, writeJob, updateJob, listJobs } from "./store";
import { readRun, startLearningRun, changeRun } from "./learning-runs";
import { learningResult, type LearningQuestion } from "../lib/learning";
import { type DocumentJob, publicDocument } from "../lib/documents";
import {
  authorizeBlobUpload,
  completeBlobUpload,
  sourceStorage,
  blobPath,
  readSourceFile,
} from "./source-files";
import type { HandleUploadBody } from "@vercel/blob/client";

const url = process.env.TEST_DATABASE_URL;
// These tests must never use the application's DATABASE_URL or a production database.
if (url && !new URL(url).pathname.startsWith("/vuihoc_test_"))
  throw new Error("TEST_DATABASE_URL must name a vuihoc_test_ database.");
if (url) process.env.DATABASE_URL = url;
else delete process.env.DATABASE_URL;
const integration = { skip: !url };
const ids: string[] = [];
after(async () => {
  if (url)
    for (const id of ids) {
      await query("DELETE FROM vuihoc_runs WHERE document_id=$1", [id]);
      await query("DELETE FROM vuihoc_documents WHERE id=$1", [id]);
    }
  await closeDatabase();
});
function document(): DocumentJob {
  const id = randomUUID();
  ids.push(id);
  return {
    id,
    owner: randomUUID(),
    title: "Postgres test",
    subject: "math",
    mode: "weekly",
    practiceCount: 25,
    pageRange: "",
    files: [
      { name: "one.pdf", size: 20, mime: "application/pdf", uploaded: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "uploading",
    message: "",
    totalPages: 0,
    selectedPages: [],
    completedPages: [],
    batches: [],
    model: "test",
    storage: "blob",
    analysisExecution: randomUUID(),
  };
}
const question: LearningQuestion = {
  id: "q1",
  sourceIds: [],
  sourcePages: [1],
  topic: "Cộng",
  label: "Câu 1",
  prompt: "2 + 3 = ?",
  passage: "",
  options: [
    { label: "A", text: "5" },
    { label: "B", text: "6" },
    { label: "C", text: "7" },
  ],
  hasFigure: false,
  figureDescription: "",
  advanced: false,
  translation: "",
  grading: "choice",
  answer: "A",
  acceptedAnswers: [],
  hints: ["Gộp hai nhóm.", "Đếm thêm.", "Thêm 3."],
  steps: ["Có 2, thêm 3.", "2 + 3 = 5."],
  explanation: "Cộng hai nhóm.",
  englishSteps: [],
  checks: [],
};

test(
  "Postgres persists documents, isolates owners and serializes concurrent updates",
  integration,
  async () => {
    const job = document();
    await writeJob(job);
    await Promise.all(
      Array.from({ length: 12 }, () =>
        updateJob(
          job.id,
          (j) => {
            j.practiceCount++;
          },
          job.owner,
        ),
      ),
    );
    assert.equal((await readJob(job.id, job.owner)).practiceCount, 37);
    assert.deepEqual(
      (await listJobs(job.owner)).map((j) => j.id),
      [job.id],
    );
    await assert.rejects(readJob(job.id, "another-owner"), /Không tìm thấy/);
    assert.deepEqual(await listJobs("another-owner"), []);
    assert.equal(
      "analysisExecution" in publicDocument(await readJob(job.id)),
      false,
    );
    await closeDatabase();
    assert.equal((await readJob(job.id, job.owner)).practiceCount, 37);
  },
);
test(
  "Postgres run creation is atomic and first score survives connection restarts",
  integration,
  async () => {
    const j = document();
    j.status = "complete";
    j.learning = {
      id: randomUUID(),
      status: "ready",
      count: 5,
      topics: ["Cộng"],
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      model: "test",
      message: "",
      parts: [
        {
          key: "practice-0",
          kind: "practice",
          sourceIds: [],
          count: 1,
          done: true,
          questions: [question],
          skipped: [],
        },
      ],
    };
    await writeJob(j);
    const runs = await Promise.all(
      Array.from({ length: 4 }, () =>
        startLearningRun(j.id, j.owner, { kind: "practice" }),
      ),
    );
    assert.equal(new Set(runs.map((r) => r.id)).size, 1);
    const id = runs[0].id;
    await changeRun(j.id, id, j.owner, {
      eventId: randomUUID(),
      action: "answer",
      questionId: "q1",
      answer: "B",
    });
    await changeRun(j.id, id, j.owner, {
      eventId: randomUUID(),
      action: "answer",
      questionId: "q1",
      answer: "A",
    });
    await changeRun(j.id, id, j.owner, {
      eventId: randomUUID(),
      action: "finish",
      questionId: "q1",
    });
    await closeDatabase();
    assert.equal(learningResult(await readRun(j.id, id, j.owner)).score, 0);
    await assert.rejects(readRun(j.id, id, "another-owner"), /Không tìm thấy/);
  },
);
test(
  "Blob token binds owner, exact path, MIME, size and prohibits overwrite",
  integration,
  async () => {
    const j = document();
    j.files[0].size = 8 * 1024 * 1024;
    await writeJob(j);
    const old = process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "test-only";
    let options: unknown;
    const fake = mock.method(
      sourceStorage,
      "handleUpload",
      async (args: Parameters<typeof sourceStorage.handleUpload>[0]) => {
        const body = args.body as Extract<
          HandleUploadBody,
          { type: "blob.generate-client-token" }
        >;
        options = await args.onBeforeGenerateToken(
          body.payload.pathname,
          null,
          true,
        );
        return { type: "blob.generate-client-token", clientToken: "test-only" };
      },
    );
    const request = new Request("http://localhost/token");
    const body = (pathname: string): HandleUploadBody => ({
      type: "blob.generate-client-token",
      payload: { pathname, clientPayload: null, multipart: true },
    });
    try {
      await authorizeBlobUpload(
        request,
        body(blobPath(j.id, 0)),
        j.id,
        0,
        j.owner,
      );
      assert.equal(
        (options as { maximumSizeInBytes: number }).maximumSizeInBytes,
        8 * 1024 * 1024,
      );
      assert.equal(
        (options as { allowOverwrite: boolean }).allowOverwrite,
        false,
      );
      await assert.rejects(
        authorizeBlobUpload(request, body("other/file"), j.id, 0, j.owner),
      );
      await assert.rejects(
        authorizeBlobUpload(
          request,
          body(blobPath(j.id, 0)),
          j.id,
          0,
          "other-owner",
        ),
      );
      await updateJob(j.id, (x) => {
        x.files[0].uploaded = true;
      });
      await assert.rejects(
        authorizeBlobUpload(request, body(blobPath(j.id, 0)), j.id, 0, j.owner),
      );
    } finally {
      fake.mock.restore();
      if (old === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
      else process.env.BLOB_READ_WRITE_TOKEN = old;
    }
  },
);
test(
  "Blob completion verifies bytes and never accepts a client URL; invalid content is removed",
  integration,
  async () => {
    const j = document();
    const bytes = Buffer.from("%PDF-1.7\nfixture....");
    j.files[0].size = bytes.length;
    await writeJob(j);
    let downloadedPath: string | undefined;
    let deleted = false;
    let content = bytes;
    const metadata = {
      pathname: blobPath(j.id, 0),
      size: bytes.length,
      contentType: "application/pdf",
    };
    const h = mock.method(sourceStorage, "head", async () => metadata);
    const g = mock.method(sourceStorage, "get", async (pathname: string) => {
      downloadedPath = pathname;
      return {
        statusCode: 200,
        stream: new Response(content).body!,
        blob: metadata,
        headers: new Headers(),
      };
    });
    const d = mock.method(sourceStorage, "del", async () => {
      deleted = true;
    });
    try {
      await assert.rejects(completeBlobUpload(j.id, 0, "other-owner"));
      assert.equal(downloadedPath, undefined);
      content = Buffer.alloc(bytes.length, 65);
      await assert.rejects(completeBlobUpload(j.id, 0, j.owner), /không khớp/);
      assert.equal(deleted, true);
      assert.equal((await readJob(j.id)).files[0].uploaded, false);
      content = bytes;
      await completeBlobUpload(j.id, 0, j.owner);
      assert.equal(downloadedPath, blobPath(j.id, 0));
      const stored = await readJob(j.id);
      assert.equal(stored.files[0].uploaded, true);
      assert.deepEqual(await readSourceFile(stored, 0), bytes);
      await completeBlobUpload(j.id, 0, j.owner); // Safe when the browser retries an acknowledgement.
    } finally {
      h.mock.restore();
      g.mock.restore();
      d.mock.restore();
    }
  },
);
