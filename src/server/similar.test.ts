import { testStudent } from "./test-support/accounts";
import { before } from "node:test";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import type { DocumentJob } from "../lib/documents";
import { arithmetic } from "./learning-validation";
import { runView, type LearningQuestion } from "../lib/learning";
import { similarDifficulties, similarLevel } from "../lib/similar";
import { writeJob } from "./store";
import { startLearningRun, readRun, changeRun } from "./learning-runs";
import {
  requestSimilar,
  retrySimilar,
  generateSimilarQuestion,
  similarDispatcher,
  buildSimilarQuestion,
} from "./similar";
import { generateSimilarWorkflow } from "../workflows/similar";
import { POST } from "../app/api/documents/[[...parts]]/route";

let visitor = "visitor";
const root = mkdtempSync(join(tmpdir(), "vuihoc-similar-"));
process.env.VUIHOC_DATA_DIR = root;
after(() => fs.rm(root, { recursive: true, force: true }));
const question = (index = 0): LearningQuestion => {
  const offset = (index % 4) + Math.floor(index / 4) * 10;
  const base = 26 + offset;
  const fields = [
    { id: "a", label: `${base} + 29` },
    { id: "b", label: `${45 + offset} + 38` },
    { id: "c", label: `${41 + offset} - 27` },
    { id: "d", label: `${60 + offset} - 16` },
  ];
  return {
    id: `q${index}`,
    sourceIds: ["q0"],
    sourcePages: [1],
    label: "Đặt tính",
    topic: "Cộng trừ có nhớ",
    prompt: `Đặt tính rồi tính: ${fields.map((f) => f.label).join("; ")}`,
    passage: "",
    options: [],
    hasFigure: false,
    figureDescription: "",
    advanced: false,
    translation: "",
    grading: "self_review",
    contentVersion: 2,
    answer: `${55 + offset}; ${83 + offset}; ${14 + offset}; ${44 + offset}`,
    acceptedAnswers: [],
    hints: [
      "Đặt thẳng cột.",
      "Tính đơn vị trước.",
      "Nhớ hoặc mượn sang hàng chục.",
    ],
    steps: ["Đặt tính thẳng cột.", "Cộng trừ lần lượt từ hàng đơn vị."],
    explanation: "Các chữ số cùng hàng thẳng cột.",
    englishSteps: [],
    checks: fields.map((f) => ({
      expression: f.label,
      value: arithmetic(f.label),
    })),
    answerFields: fields,
    rubric: fields.map((f) => ({
      id: f.id,
      label: f.label,
      criteria: "Kết quả đúng theo phép tính.",
      maxPoints: 0.25,
    })),
  };
};
async function fixture(q = question()) {
  await testStudent("a".repeat(64), visitor);
  const now = new Date().toISOString();
  const j: DocumentJob = {
    id: randomUUID(),
    owner: "owner",
    title: "Nguồn",
    subject: "math",
    mode: "weekly",
    practiceCount: 5,
    pageRange: "",
    files: [
      { name: "bai.pdf", mime: "application/pdf", size: 100, uploaded: true },
    ],
    status: "complete",
    message: "",
    model: "test",
    totalPages: 1,
    selectedPages: [1],
    completedPages: [1],
    batches: [],
    createdAt: now,
    updatedAt: now,
    learning: {
      id: randomUUID(),
      status: "ready",
      count: 0,
      topics: [q.topic],
      createdAt: now,
      updatedAt: now,
      model: "test",
      message: "",
      contentVersion: 2,
      parts: [
        {
          key: "original",
          kind: "original",
          sourceIds: [q.id],
          count: 1,
          done: true,
          questions: [{ ...q, sourceIds: [q.id], sourcePages: [1] }],
          skipped: [],
        },
      ],
    },
  };
  await writeJob(j);
  const run = await startLearningRun(j.id, visitor, { kind: "original" });
  return { j, run };
}
async function mockAI(
  work: (control: {
    reject: boolean;
    calls: number;
    dispatches: number;
  }) => Promise<void>,
) {
  // Each test exercises a new learner; repeated content from earlier test runs
  // must not count as this learner's already-assigned questions.
  visitor = `visitor-${randomUUID()}`;
  const fetch = globalThis.fetch,
    key = process.env.OPENROUTER_API_KEY,
    start = similarDispatcher.start;
  const control = { reject: false, calls: 0, dispatches: 0 };
  process.env.OPENROUTER_API_KEY = "test-only";
  similarDispatcher.start = async () => {
    control.dispatches++;
  };
  globalThis.fetch = async (_url, options) => {
    control.calls++;
    const body = JSON.parse(String(options?.body));
    const payload = JSON.parse(body.messages[1].content[0].text);
    let result;
    if (body.response_format.json_schema.name === "similar_question") {
      const q = question(payload.index + 1);
      const { answerFields, ...draft } = q;
      const { contentVersion: _v, ...schemaFields } = draft;
      result = { question: schemaFields, answerFields };
    } else {
      result = {
        valid: !control.reject,
        reason: control.reject
          ? "Hint mâu thuẫn với đáp án."
          : "Đã tự giải và kiểm tra đủ bốn ý.",
        answer: payload.question.answer,
        responseCount: 4,
        sameStructure: true,
        difficultyAppropriate: true,
        hintsConsistent: !control.reject,
        difficultyEvidence: "Cùng số toán hạng, phạm vi và nhớ/mượn với nguồn.",
        answerMatches: true,
        answerEvidence: "Đã tự tính từng ý và so đáp án.",
        selfContained: true,
        uniqueAnswer: true,
      };
    }
    return Response.json({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(result) } },
      ],
    });
  };
  try {
    await work(control);
  } finally {
    globalThis.fetch = fetch;
    similarDispatcher.start = start;
    if (key === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = key;
  }
}

test("Five big questions retain four subparts, publish first early, preserve work and resume only missing questions", async () =>
  mockAI(async (control) => {
    const { j, run } = await fixture();
    const request = {
      questionId: "q0",
      requestId: randomUUID(),
      difficulty: "same",
    };
    const next = await requestSimilar(j.id, run.id, visitor, request);
    assert.equal(next.questions.length, 0);
    assert.equal(next.similar?.difficulty, "same");
    assert.equal("source" in next.similar!, false);
    assert.equal(
      "similarRequests" in runView(await readRun(j.id, run.id, visitor)),
      false,
    );
    assert.equal(
      (await requestSimilar(j.id, run.id, visitor, request)).id,
      next.id,
    );
    assert.equal(control.dispatches, 1);
    let saved = await readRun(j.id, next.id, visitor);
    const execution = saved.similar!.execution;
    assert.equal(
      await generateSimilarQuestion(j.id, next.id, 0, execution),
      true,
    );
    saved = await readRun(j.id, next.id, visitor);
    assert.equal(saved.questions.length, 1);
    assert.equal(saved.similar?.status, "generating");
    assert.equal(runView(saved).questions[0].solution, undefined);
    assert.equal("rubric" in runView(saved).questions[0], false);
    assert.ok(saved.questions[0].generationApproval);
    assert.equal("generationApproval" in runView(saved).questions[0], false);
    assert.equal(saved.questions[0].answerFields?.length, 4);
    assert.equal(control.calls, 2);
    const hint = await changeRun(j.id, next.id, visitor, {
      action: "hint",
      questionId: saved.questions[0].id,
      eventId: randomUUID(),
    });
    assert.equal(hint.questions[0].hint, saved.questions[0].hints[0]);
    await assert.rejects(
      () =>
        changeRun(j.id, next.id, visitor, {
          action: "finish",
          eventId: randomUUID(),
        }),
      /đủ 5 câu/,
    );
    control.reject = true;
    assert.equal(
      await generateSimilarQuestion(j.id, next.id, 1, execution),
      false,
    );
    saved = await readRun(j.id, next.id, visitor);
    assert.equal(saved.similar?.status, "failed");
    assert.match(saved.similar?.lastError || "", /Hint/);
    assert.equal("lastError" in runView(saved).similar!, false);
    control.reject = false;
    await retrySimilar(j.id, next.id, visitor);
    saved = await readRun(j.id, next.id, visitor);
    const nextExecution = saved.similar!.execution;
    assert.notEqual(nextExecution, execution);
    const calls = control.calls;
    assert.equal(
      await generateSimilarQuestion(j.id, next.id, 1, execution),
      false,
    );
    assert.equal(control.calls, calls);
    await generateSimilarWorkflow(j.id, next.id, nextExecution);
    saved = await readRun(j.id, next.id, visitor);
    assert.equal(saved.questions.length, 5);
    assert.equal(saved.similar?.status, "ready");
    const dispatches = control.dispatches;
    assert.equal(
      (await retrySimilar(j.id, next.id, visitor)).similar?.status,
      "ready",
    );
    assert.equal(control.dispatches, dispatches);
    assert.deepEqual(
      saved.questions.map((q) => q.answerFields?.length),
      [4, 4, 4, 4, 4],
    );
    assert.equal(saved.attempts[saved.questions[0].id].hintOpens, 1);
    assert.equal((await readRun(j.id, run.id, visitor)).questions.length, 1);
    const finished = await changeRun(j.id, next.id, visitor, {
      action: "finish",
      eventId: randomUUID(),
    });
    assert.equal(finished.finished, true);
  }));

test("Similarity API validates origin, source access and difficulty, and stores a recoverable failed dispatch", async () =>
  mockAI(async () => {
    const { j, run } = await fixture();
    const send = (
      parts: string[],
      body: unknown,
      origin = "http://localhost",
    ) =>
      POST(
        new NextRequest(`http://localhost/api/documents/${parts.join("/")}`, {
          method: "POST",
          headers: {
            origin,
            "content-type": "application/json",
            cookie: `vuihoc-session=${"a".repeat(64)}`,
          },
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ parts }) },
      );
    const body = {
      questionId: "q0",
      requestId: randomUUID(),
      difficulty: "advanced",
    };
    assert.equal(
      (
        await send(
          [j.id, "runs", run.id, "similar"],
          body,
          "https://bad.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await send([j.id, "runs", run.id, "similar"], {
          ...body,
          difficulty: "impossible",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await send([j.id, "runs", run.id, "similar"], {
          ...body,
          questionId: "not-in-source",
        })
      ).status,
      409,
    );
    const other = await fixture();
    assert.equal(
      (await send([other.j.id, "runs", run.id, "similar"], body)).status,
      404,
    );
    similarDispatcher.start = async () => {
      throw Error("lost acknowledgement");
    };
    const response = await send([j.id, "runs", run.id, "similar"], body);
    assert.equal(response.status, 201);
    const next = await response.json();
    assert.equal(next.similar.status, "failed");
    assert.equal(
      (await send([j.id, "runs", run.id, "similar"], body)).status,
      201,
    );
    const saved = await readRun(j.id, next.id, visitor);
    assert.notEqual(saved.similar?.execution, undefined);
  }));

test("A word problem produces a new complete written problem, not a list of calculation questions", async () => {
  const q = {
    ...question(),
    prompt:
      "Lan có 24 quyển vở, cho Mai 8 quyển. Hỏi Lan còn bao nhiêu quyển vở?",
    answer: "16 quyển vở",
    answerFields: [{ id: "answer", label: "Bài giải" }],
    rubric: [
      {
        id: "result",
        label: "Đáp số",
        criteria: "Lan còn 16 quyển vở",
        kind: "result" as const,
        maxPoints: 1,
      },
    ],
    checks: [{ expression: "24-8", value: 16 }],
  };
  const fetch = globalThis.fetch,
    key = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test";
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    const body = JSON.parse(String(options?.body));
    assert.match(body.messages[0].content, /lời văn/);
    let result;
    if (body.response_format.json_schema.name === "similar_question") {
      const { answerFields: _, contentVersion: _v, ...draft } = q;
      result = {
        question: {
          ...draft,
          prompt:
            "Minh có 35 nhãn vở, cho An 9 nhãn vở. Hỏi Minh còn bao nhiêu nhãn vở?",
          answer: "26 nhãn vở",
          checks: [{ expression: "35-9", value: 26 }],
        },
        answerFields: [{ id: "answer", label: "Bài giải" }],
      };
    } else
      result = {
        valid: true,
        reason: "Bài toán lời văn mới cùng dạng",
        answer: "26 nhãn vở",
        responseCount: 1,
        sameStructure: true,
        difficultyAppropriate: true,
        hintsConsistent: true,
        difficultyEvidence: "Giữ một phép trừ có mượn trong phạm vi 100.",
        answerMatches: true,
        answerEvidence: "35 - 9 = 26 nhãn vở.",
        selfContained: true,
        uniqueAnswer: true,
      };
    return Response.json({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(result) } },
      ],
    });
  };
  try {
    const next = await buildSimilarQuestion(q, "progressive", 0, [], "test");
    assert.match(next.prompt, /Minh có/);
    assert.equal(next.grading, "self_review");
    assert.equal(next.answerFields?.length, 1);
    assert.equal(next.hints.length, 3);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = fetch;
    if (key === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = key;
  }
});

test("Difficulty options retain the requested labels and progressive defaults to the current level", () => {
  assert.deepEqual(
    similarDifficulties.map((d) => d.label),
    ["Ngang câu hiện tại", "Khó hơn", "Khó hơn chút", "Tăng dần", "Nâng cao"],
  );
  assert.equal(similarLevel("progressive", 0), "same");
  assert.equal(similarLevel("progressive", 4), "advanced");
  for (const d of similarDifficulties.filter((d) => d.value !== "progressive"))
    assert.equal(similarLevel(d.value, 4), d.value);
});

test("Background publication and written grading do not block or overwrite each other", async () =>
  mockAI(async () => {
    const { j, run } = await fixture();
    const next = await requestSimilar(j.id, run.id, visitor, {
      questionId: "q0",
      requestId: randomUUID(),
      difficulty: "same",
    });
    const execution = (await readRun(j.id, next.id, visitor)).similar!
      .execution;
    await generateSimilarQuestion(j.id, next.id, 0, execution);
    const first = (await readRun(j.id, next.id, visitor)).questions[0];
    const fetch = globalThis.fetch;
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>((r) => (release = r)),
      entered = new Promise<void>((r) => (started = r));
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(String(options?.body));
      if (
        body.response_format.json_schema.name.startsWith("written_assessment")
      ) {
        started();
        await gate;
        const payload = JSON.parse(body.messages[1].content[0].text);
        const result = {
          confident: true,
          feedback: "Đã chấm",
          parts: payload.rubric.map((r: { id: string; maxPoints: number }) => ({
            id: r.id,
            confident: true,
            points: r.id.endsWith(":method") ? 0 : r.maxPoints,
            feedback: "Đã kiểm tra",
          })),
        };
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(result) },
            },
          ],
        });
      }
      return fetch(url, options);
    };
    const submission = changeRun(j.id, next.id, visitor, {
      action: "answer",
      eventId: randomUUID(),
      questionId: first.id,
      answer: JSON.stringify({ a: "56", b: "84", c: "15", d: "45" }),
    });
    try {
      await entered;
      assert.equal(
        await generateSimilarQuestion(j.id, next.id, 1, execution),
        true,
      );
      release();
      await submission;
      const saved = await readRun(j.id, next.id, visitor);
      assert.equal(saved.questions.length, 2);
      assert.equal(saved.attempts[first.id].solved, true);
      assert.equal(saved.attempts[first.id].assessmentHistory?.length, 1);
    } finally {
      release();
      await submission.catch(() => {});
      globalThis.fetch = fetch;
    }
  }));
