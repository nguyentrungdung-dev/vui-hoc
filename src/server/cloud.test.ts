import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { closeDatabase, query } from "./database";
import { readJob, writeJob, updateJob, listJobs } from "./store";
import { readLibraryJob, listLibraryJobs } from "./library";
import { learningHistory, learningView, listRuns } from "./learning-runs";
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
    j.files[0].uploaded = true;
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
    assert.equal((await readLibraryJob(j.id, "visitor")).id, j.id);
    assert.ok(
      (await listLibraryJobs("visitor")).some((doc) => doc.id === j.id),
    );
    const visitor = await startLearningRun(j.id, "visitor", {
      kind: "practice",
    });
    assert.equal(visitor.id, id);
    assert.equal("owner" in visitor, false);
    assert.deepEqual(
      (await listRuns(j.id, "visitor")).map((r) => r.id),
      [id],
    );
    assert.deepEqual(
      (await listRuns(j.id, j.owner)).map((r) => r.id),
      [id],
    );

    await changeRun(j.id, id, j.owner, {
      eventId: randomUUID(),
      action: "answer",
      questionId: "q1",
      answer: "B",
    });
    // Concurrent retries of one event count once, while distinct answers all persist.
    const duplicate = {
      eventId: randomUUID(),
      action: "answer",
      questionId: "q1",
      answer: "B",
    };
    await Promise.all([
      ...Array.from({ length: 4 }, () =>
        changeRun(j.id, id, "visitor", duplicate),
      ),
      ...Array.from({ length: 4 }, () =>
        changeRun(j.id, id, "visitor", { ...duplicate, eventId: randomUUID() }),
      ),
    ]);
    const beforeInvalid = await readRun(j.id, id, "visitor");
    assert.equal(beforeInvalid.attempts.q1.tries, 6);
    assert.equal(beforeInvalid.attempts.q1.first, "B");
    await assert.rejects(
      changeRun(j.id, id, "visitor", {
        ...duplicate,
        eventId: randomUUID(),
        questionId: "stale-question",
      }),
      /đã thay đổi/,
    );
    assert.deepEqual(await readRun(j.id, id, "visitor"), beforeInvalid);
    await changeRun(j.id, id, "visitor", {
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
    const saved = await readRun(j.id, id, j.owner);
    assert.equal(learningResult(saved).score, 0);
    assert.equal(saved.attempts.q1.tries, 7);
    assert.equal(saved.attempts.q1.solved, true);
    assert.deepEqual(
      (await learningHistory("visitor")).find((r) => r.id === id),
      learningResult(saved),
    );
    assert.deepEqual((await learningView(j, "visitor")).runs, [
      learningResult(saved),
    ]);

    // Joined reads/history must apply the same access rule for partial and empty uploads.
    for (const files of [
      [...j.files, { ...j.files[0], name: "pending.pdf", uploaded: false }],
      [],
    ]) {
      await updateJob(j.id, (job) => {
        job.files = files;
      });
      await assert.rejects(readRun(j.id, id, "visitor"), /Không tìm thấy/);
      await assert.rejects(
        changeRun(j.id, id, "visitor", duplicate),
        /Không tìm thấy/,
      );
      assert.equal(
        (await learningHistory("visitor")).some((r) => r.id === id),
        false,
      );
      assert.deepEqual(await readRun(j.id, id, j.owner), saved);
      assert.deepEqual(
        (await learningHistory(j.owner)).find((r) => r.id === id),
        learningResult(saved),
      );
    }
    await updateJob(j.id, (job) => {
      job.files = j.files;
    });
    await query("UPDATE vuihoc_runs SET data=data-'owner' WHERE id=$1", [id]);
    assert.equal((await readRun(j.id, id, j.owner)).finished, true);
    assert.equal((await readRun(j.id, id, "visitor")).finished, true);
    assert.deepEqual(
      (await listRuns(j.id, "visitor")).map((r) => r.id),
      [visitor.id],
    );

    assert.equal((await readRun(j.id, id, "another-owner")).id, id);
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

test(
  "Guidance uses a database claim across runs, stores private audio and reuses persisted results after reconnect",
  integration,
  async () => {
    const {
      requestGuidance,
      guidanceDispatcher,
      guidanceStorage,
      authorizedGuidance,
      openGuidanceAudio,
    } = await import("./guidance");
    const { readGuidance } = await import("./guidance-store");
    const { generateGuidanceWorkflow } = await import("../workflows/guidance");
    const j = document();
    j.files[0].uploaded = true;
    j.status = "complete";
    const now = new Date().toISOString();
    j.learning = {
      id: randomUUID(),
      status: "ready",
      count: 1,
      topics: [],
      createdAt: now,
      updatedAt: now,
      model: "test",
      message: "",
      parts: [
        {
          key: "p1",
          kind: "original",
          sourceIds: [],
          count: 1,
          done: true,
          questions: [structuredClone(question)],
          skipped: [],
        },
      ],
    };
    await writeJob(j);
    const r1 = await startLearningRun(j.id, j.owner, {
      kind: "original",
      resume: false,
    });
    const r2 = await startLearningRun(j.id, "another-viewer", {
      kind: "original",
      resume: false,
    });
    const previous = {
      key: process.env.OPENROUTER_API_KEY,
      tts: process.env.OPENROUTER_TTS_MODEL,
      voice: process.env.OPENROUTER_TTS_VOICE,
      blob: process.env.BLOB_READ_WRITE_TOKEN,
    };
    process.env.OPENROUTER_API_KEY = "test-only";
    process.env.OPENROUTER_TTS_MODEL = "google/gemini-3.8-flash-lite-tts";
    process.env.OPENROUTER_TTS_VOICE = "Aoede";
    process.env.BLOB_READ_WRITE_TOKEN = "test-only";
    let dispatches = 0,
      aiCalls = 0,
      uploads = 0;
    const dispatch = mock.method(guidanceDispatcher, "start", async () => {
      dispatches++;
    });
    const fetchStub = mock.method(
      globalThis,
      "fetch",
      async (url: string | URL | Request, options?: RequestInit) => {
        aiCalls++;
        const body = JSON.parse(String(options?.body));
        if (String(url).endsWith("chat/completions")) {
          const scripts = JSON.parse(body.messages[1].content[0].text)
            .scripts as string[];
          return Response.json({
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    scenes: scripts.map((text) => ({
                      tiles: [
                        {
                          text,
                          slot: 0,
                          appearAt: 0,
                          highlightAt: 0.5,
                          moveTo: null,
                        },
                      ],
                    })),
                  }),
                },
              },
            ],
          });
        }
        const bytes = Buffer.alloc(212);
        return new Response(bytes, {
          headers: { "content-type": "audio/pcm;rate=24000;channels=1" },
        });
      },
    );
    const putStub = mock.method(
      guidanceStorage,
      "put",
      async (
        ...[pathname, _body, options]: Parameters<typeof guidanceStorage.put>
      ) => {
        uploads++;
        assert.equal(options.access, "private");
        assert.ok(String(pathname).startsWith(`guidance/${j.id}/`));
        return {} as Awaited<ReturnType<typeof guidanceStorage.put>>;
      },
    );
    const getStub = mock.method(
      guidanceStorage,
      "get",
      async (
        ...[_pathname, options]: Parameters<typeof guidanceStorage.get>
      ) => {
        assert.equal(options.access, "private");
        return {
          statusCode: 200,
          stream: new Response(Buffer.alloc(256)).body!,
        } as Awaited<ReturnType<typeof guidanceStorage.get>>;
      },
    );
    try {
      const results = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          requestGuidance(j.id, i % 2 ? r1.id : r2.id, "another-viewer", {
            questionId: question.id,
          }),
        ),
      );
      assert.equal(dispatches, 1);
      assert.equal(new Set(results.map((r) => r.guidance.id)).size, 1);
      const id = results[0].guidance.id;
      const saved = (await readGuidance(j.id, id))!;
      await generateGuidanceWorkflow(j.id, id, saved.execution);
      assert.equal((await readGuidance(j.id, id))!.status, "ready");
      assert.equal(uploads, 3);
      assert.equal(aiCalls, 4);
      await closeDatabase();
      const result = await requestGuidance(j.id, r1.id, "another-viewer", {
        questionId: question.id,
      });
      assert.equal(result.guidance.status, "ready");
      assert.equal(dispatches, 1);
      const asset = await authorizedGuidance(j.id, r2.id, "another-viewer", id);
      assert.equal(asset.audio[0]!.storage, "blob");
      const stream = await openGuidanceAudio(asset, 0);
      assert.equal((await new Response(stream).arrayBuffer()).byteLength, 256);
    } finally {
      dispatch.mock.restore();
      fetchStub.mock.restore();
      putStub.mock.restore();
      getStub.mock.restore();
      for (const [name, value] of Object.entries({
        OPENROUTER_API_KEY: previous.key,
        OPENROUTER_TTS_MODEL: previous.tts,
        OPENROUTER_TTS_VOICE: previous.voice,
        BLOB_READ_WRITE_TOKEN: previous.blob,
      })) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  },
);
