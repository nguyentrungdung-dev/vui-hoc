import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import type { DocumentJob } from "../lib/documents";
import { testStudent } from "./test-support/accounts";
import { readJob, writeJob, updateJob } from "./store";
import { dispatcher } from "./dispatch";
import { quickPracticePages } from "./revision";
import { preparePack, processLearning } from "./generation";
import {
  listQuickPractice,
  requestQuickPractice,
  prepareQuickPractice,
  retryQuickPractice,
  failQuickPractice,
  quickPracticeView,
} from "./quick-practice";
import { GET, POST } from "../app/api/documents/[[...parts]]/route";
import { startLearningRun } from "./learning-runs";

const root = mkdtempSync(path.join(os.tmpdir(), "vuihoc-quick-practice-"));
process.env.VUIHOC_DATA_DIR = root;
after(() => fs.rm(root, { recursive: true, force: true }));
const token = "a".repeat(64);
const viewer = createHash("sha256").update(token).digest("hex");
before(() => testStudent(token));
function source(): DocumentJob {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: "Đề học kỳ",
    owner: viewer,
    subject: "math",
    mode: "weekly",
    practiceCount: 0,
    files: [
      { name: "source.pdf", mime: "application/pdf", size: 10, uploaded: true },
    ],
    pageRange: "",
    createdAt: now,
    updatedAt: now,
    status: "analyzing",
    message: "Đang nhận diện",
    model: "test",
    totalPages: 2,
    selectedPages: [1, 2],
    completedPages: [1],
    batches: [
      {
        key: "p",
        pages: [1, 2],
        result: {
          summary: "Cộng",
          pages: [1, 2].map((page) => ({
            page,
            text: "Bài 1. Tính 2 + 3 = ?",
            topics: ["Cộng"],
            issues: [],
          })),
          questions: [],
        },
      },
    ],
  };
}
async function api(
  method: "GET" | "POST",
  parts: string[],
  body?: unknown,
  cookie = `vuihoc-session=${token}`,
  origin = "http://localhost:3100",
) {
  const req = new NextRequest(
    `http://localhost:3100/api/documents/${parts.join("/")}`,
    {
      method,
      headers: {
        cookie,
        origin,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
  );
  return (method === "GET" ? GET : POST)(req, {
    params: Promise.resolve({ parts }),
  });
}

test("A saved request waits for all selected pages, then prepares separately while originals are still generating; duplicate submissions dispatch once", async () => {
  const src = source();
  await writeJob(src);
  const dispatch = mock.method(dispatcher, "start", async () => {});
  try {
    const requestId = randomUUID();
    const results = await Promise.all([
      requestQuickPractice(src.id, viewer, { requestId, count: 7 }),
      requestQuickPractice(src.id, viewer, { requestId, count: 7 }),
    ]);
    assert.ok(results.every((v) => v.status === "waiting_source"));
    assert.equal(dispatch.mock.calls.length, 1);
    assert.equal(dispatch.mock.calls[0].arguments[0], "quick-practice");
    let job = await readJob(requestId);
    assert.equal(
      await prepareQuickPractice(job.id, job.learningExecution!),
      "waiting",
    );
    await updateJob(src.id, (j) => {
      j.status = "complete";
      j.completedPages = [1, 2];
      j.learning = preparePack(j, { count: 0, scope: "original" });
      j.learning.status = "generating";
    });
    const before = await readJob(src.id);
    assert.equal(
      await prepareQuickPractice(job.id, job.learningExecution!),
      "ready",
    );
    job = await readJob(requestId);
    assert.equal(job.quickPractice?.waitingForSource, false);
    assert.equal(job.learning?.count, 7);
    assert.ok(job.learning?.parts.every((p) => p.kind === "practice"));
    assert.equal(job.learning?.status, "queued");
    assert.deepEqual(await readJob(src.id), before);
    assert.equal(await prepareQuickPractice(job.id, randomUUID()), "stop");
    assert.equal((await listQuickPractice(src.id, viewer)).length, 1);
    assert.deepEqual(await listQuickPractice(src.id, "another-student"), []);
    await assert.rejects(retryQuickPractice(src.id, job.id, "another-student"));
    await assert.rejects(
      requestQuickPractice(src.id, viewer, { requestId, count: 8 }),
      /đã được sử dụng/,
    );
    await failQuickPractice(job.id, randomUUID());
    assert.equal((await readJob(job.id)).learning?.status, "queued");
  } finally {
    dispatch.mock.restore();
  }
});

test("Dispatch failure and incomplete extraction remain retryable; old executions cannot overwrite a retried request", async () => {
  const src = source();
  await writeJob(src);
  const dispatch = mock.method(dispatcher, "start", async () => {
    throw new Error("queue down");
  });
  try {
    const first = await requestQuickPractice(src.id, viewer, {
      requestId: randomUUID(),
      count: 5,
    });
    assert.equal(first.status, "failed");
    assert.equal((await readJob(first.id)).learningExecution, undefined);
    dispatch.mock.restore();
    const ok = mock.method(dispatcher, "start", async () => {});
    try {
      await retryQuickPractice(src.id, first.id, viewer);
      const retried = await readJob(first.id);
      await updateJob(src.id, (j) => {
        j.status = "partial";
      });
      assert.equal(
        await prepareQuickPractice(first.id, retried.learningExecution!),
        "stop",
      );
      assert.match((await readJob(first.id)).message, /nhận diện đủ/);
      await updateJob(src.id, (j) => {
        j.status = "complete";
        j.completedPages = [1, 2];
      });
      await retryQuickPractice(src.id, first.id, viewer);
      const next = await readJob(first.id);
      assert.notEqual(next.learningExecution, retried.learningExecution);
      await failQuickPractice(first.id, retried.learningExecution!);
      assert.equal((await readJob(first.id)).status, "queued");
      assert.equal(
        await prepareQuickPractice(first.id, next.learningExecution!),
        "ready",
      );
    } finally {
      ok.mock.restore();
    }
  } finally {
    dispatch.mock.restore();
  }
});

test("Quick-practice API validates auth, origin/count and private summaries without exposing source answers", async () => {
  const src = source();
  await writeJob(src);
  const dispatch = mock.method(dispatcher, "start", async () => {});
  try {
    for (const count of [0, 4, 51, 5.5, "10"])
      assert.equal(
        (
          await api("POST", [src.id, "quick-practice"], {
            requestId: randomUUID(),
            count,
          })
        ).status,
        400,
      );
    assert.equal(
      (
        await api(
          "POST",
          [src.id, "quick-practice"],
          { requestId: randomUUID(), count: 5 },
          "",
          "http://localhost:3100",
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await api(
          "POST",
          [src.id, "quick-practice"],
          {},
          `vuihoc-session=${token}`,
          "https://other.example",
        )
      ).status,
      403,
    );
    const response = await api("POST", [src.id, "quick-practice"], {
      requestId: randomUUID(),
      count: 10,
    });
    assert.equal(response.status, 201);
    const summary = await (await api("GET", [src.id, "quick-practice"])).json();
    assert.equal(summary.sets.length, 1);
    for (const key of [
      "answer",
      "questions",
      "owner",
      "learningExecution",
      "model",
    ])
      assert.ok(!Object.hasOwn(summary.sets[0], key));
  } finally {
    dispatch.mock.restore();
  }
});

test("A prepared quick set generates the chosen count, passes independent checks, opens for practice and retries only unfinished parts", async () => {
  const src = source();
  src.status = "complete";
  src.completedPages = [1, 2];
  await writeJob(src);
  const dispatch = mock.method(dispatcher, "start", async () => {});
  const savedKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test";
  const fetcher = mock.method(
    globalThis,
    "fetch",
    async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const name = body.response_format.json_schema.name;
      const text = body.messages[1].content[0].text;
      if (name === "learning_content") {
        const payload = JSON.parse(text.split("\nNguồn: ")[1].split("\n")[0]);
        return response({
          questions: payload.assignments.map(
            (a: { id: string; topic: string }, i: number) => ({
              id: a.id,
              label: a.id,
              sourceIds: [],
              sourcePages: [payload.targets[i % payload.targets.length].page],
              topic: a.topic,
              prompt: `${Number(a.id.split("-")[1]) + 20} + 1 = ?`,
              passage: "",
              options: [
                { label: "A", text: String(Number(a.id.split("-")[1]) + 21) },
                { label: "B", text: "0" },
                { label: "C", text: "1" },
              ],
              hasFigure: false,
              figureDescription: "",
              advanced: false,
              grading: "choice",
              answer: "A",
              acceptedAnswers: [],
              translation: "",
              hints: ["Xem phép cộng", "Thêm một", "Đếm tiếp một đơn vị"],
              steps: ["Đếm tiếp một đơn vị.", "Chọn A."],
              explanation: "Thêm một đơn vị vào số đã cho.",
              englishSteps: [],
              rubric: [],
              checks: [],
            }),
          ),
          skipped: [],
        });
      }
      const payload = JSON.parse(text);
      return response({
        reviews: payload.questions.map((q: { id: string }) => ({
          id: q.id,
          valid: true,
          ...(name === "teaching_review" ? { answer: "A" } : {}),
          reason: "Đã giải độc lập và đối chiếu.",
        })),
      });
    },
  );
  function response(result: unknown) {
    return Response.json({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(result) } },
      ],
    });
  }
  try {
    const view = await requestQuickPractice(src.id, viewer, {
      requestId: randomUUID(),
      count: 7,
    });
    const pending = await readJob(view.id);
    await prepareQuickPractice(view.id, pending.learningExecution!);
    await processLearning(view.id);
    let ready = await readJob(view.id);
    assert.equal(quickPracticeView(ready).status, "ready");
    assert.equal(quickPracticeView(ready).createdCount, 7);
    const run = await startLearningRun(view.id, viewer, { kind: "practice" });
    assert.equal(run.questions.length, 7);
    assert.ok(run.questions.every((q) => !("answer" in q)));
    await updateJob(view.id, (j) => {
      j.learning!.status = "partial";
      j.learning!.parts[1].done = false;
      j.learning!.parts[1].questions = [];
    });
    const first = JSON.stringify(ready.learning!.parts[0]);
    await retryQuickPractice(src.id, view.id, viewer);
    ready = await readJob(view.id);
    assert.equal(JSON.stringify(ready.learning!.parts[0]), first);
    assert.equal(
      await prepareQuickPractice(view.id, ready.learningExecution!),
      "ready",
    );
  } finally {
    dispatch.mock.restore();
    fetcher.mock.restore();
    if (savedKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = savedKey;
  }
});

test("Marked source answers do not block readable questions, but genuine missing data stays excluded", () => {
  const j = source();
  j.status = "complete";
  j.completedPages = [1, 2];
  j.batches[0].result!.pages[0].issues = ["Tài liệu có đáp án đánh dấu đỏ"];
  const q = {
    label: "Câu 1",
    prompt: "Tính 2 + 3",
    passage: "",
    topic: "Cộng",
    skill: "Cộng",
    kind: "multiple_choice",
    sourcePages: [1],
    hasFigure: false,
    figureDescription: "",
    needsReview: true,
    issues: ["Đáp án gốc có đánh dấu đỏ; không xác nhận."],
    options: [
      { label: "A", text: "5" },
      { label: "B", text: "4" },
    ],
  };
  j.batches[0].result!.questions = [
    q,
    {
      ...q,
      label: "Câu mờ",
      prompt: "Thiếu [không đọc rõ]",
      issues: ["Chữ mờ"],
    },
  ];
  const pages = quickPracticePages(j);
  assert.match(pages[0].text, /Tính 2 \+ 3/);
  assert.doesNotMatch(pages[0].text, /Câu mờ|không đọc rõ/);
  assert.equal(j.batches[0].result!.questions[0].needsReview, true);
  j.batches[0].result!.questions[0].issues.push("Thiếu dữ kiện");
  assert.ok(!quickPracticePages(j).some((p) => p.page === 1));
});

test("A lost background request can be retried after its heartbeat expires", async () => {
  const src = source();
  await writeJob(src);
  const dispatch = mock.method(dispatcher, "start", async () => {});
  try {
    const view = await requestQuickPractice(src.id, viewer, {
      requestId: randomUUID(),
      count: 5,
    });
    const pending = await readJob(view.id);
    pending.updatedAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    assert.equal(quickPracticeView(pending).status, "failed");
    await fs.writeFile(
      path.join(root, "documents", pending.id, "job.json"),
      JSON.stringify(pending),
    );
    await retryQuickPractice(src.id, pending.id, viewer);
    const retried = await readJob(pending.id);
    assert.notEqual(retried.learningExecution, pending.learningExecution);
    assert.equal(quickPracticeView(retried).status, "waiting_source");
    assert.equal(
      await prepareQuickPractice(pending.id, pending.learningExecution!),
      "stop",
    );
  } finally {
    dispatch.mock.restore();
  }
});
