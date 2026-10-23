import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/documents/[[...parts]]/route";
import { mkdtempSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { publicDocument, type DocumentJob } from "../lib/documents";
import {
  learningResult,
  runView,
  type LearningQuestion,
  type LearningRun,
} from "../lib/learning";
import { arithmetic, validateTeaching } from "./learning-validation";
import {
  applyRunAction,
  startLearningRun,
  readRun,
  changeRun,
  learningView,
} from "./learning-runs";
import { preparePack, processLearning, buildPart } from "./generation";
import { writeJob, readJob, updateJob } from "./store";
const dir = mkdtempSync(path.join(os.tmpdir(), "vuihoc-learning-"));
process.env.VUIHOC_DATA_DIR = dir;
after(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});
const question = (id = "q1"): LearningQuestion => ({
  id,
  sourceIds: ["source1"],
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
  hints: ["Gộp hai nhóm.", "Đếm thêm từ 2.", "Thêm 3 đơn vị."],
  steps: ["Có 2 đồ vật, thêm 3 đồ vật.", "2 + 3 = 5. Chọn A."],
  explanation: "Cộng là gộp các nhóm lại.",
  englishSteps: [],
  checks: [{ expression: "2+3", value: 5 }],
});
const run = (): LearningRun => ({
  id: randomUUID(),
  documentId: randomUUID(),
  title: "Kiểm thử",
  packId: randomUUID(),
  mode: "weekly",
  kind: "practice",
  questions: [question()],
  attempts: {},
  index: 0,
  finished: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  eventIds: [],
});
const action = (action: string, more: Record<string, unknown> = {}) => ({
  eventId: randomUUID(),
  action,
  questionId: "q1",
  ...more,
});
function job(): DocumentJob {
  const q = question("source1");
  return {
    id: randomUUID(),
    title: "Toán thật",
    subject: "math",
    mode: "weekly",
    practiceCount: 25,
    pageRange: "",
    files: [
      { name: "one.pdf", size: 10, mime: "application/pdf", uploaded: true },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "complete",
    message: "",
    totalPages: 1,
    selectedPages: [1],
    completedPages: [1],
    batches: [
      {
        key: "page-1",
        pages: [1],
        result: {
          summary: "Cộng",
          pages: [{ page: 1, text: "2 + 3 = ?", topics: ["Cộng"], issues: [] }],
          questions: [
            {
              label: q.label,
              prompt: q.prompt,
              passage: "",
              options: q.options,
              topic: q.topic,
              skill: "Cộng",
              kind: "multiple_choice",
              sourcePages: [1],
              hasFigure: false,
              figureDescription: "",
              needsReview: false,
              issues: [],
            },
          ],
        },
      },
    ],
    model: "test",
    owner: "owner-a",
  };
}
test("Arithmetic checks reject incorrect, malicious and ambiguous choices", () => {
  assert.equal(arithmetic("(20-3)*2+1"), 35);
  assert.throws(() => arithmetic("process.exit()"));
  assert.throws(() => arithmetic("1/0"));
  const q = question();
  validateTeaching(q, [1], ["source1"], false);
  q.checks[0].value = 9;
  assert.throws(() => validateTeaching(q, [1], ["source1"], false));
  q.checks = [];
  q.options[1].text = "5";
  assert.throws(() => validateTeaching(q, [1], ["source1"], false));
});
test("Wrong-first answers remain wrong for score; hints are separate and events are idempotent", () => {
  const r = run();
  applyRunAction(r, action("answer", { answer: "B" }));
  const hint = action("hint");
  applyRunAction(r, hint, 1000);
  applyRunAction(r, hint, 1200);
  applyRunAction(r, action("close_hint"), 3000);
  applyRunAction(r, action("answer", { answer: "A" }));
  assert.equal(r.attempts.q1.hintOpens, 1);
  assert.equal(r.attempts.q1.hintMs, 2000);
  assert.equal(learningResult(r).score, 0);
  assert.equal(learningResult(r).solved, 1);
});
test("Hint use does not lower correct-first score; guided and open answers are not independent", () => {
  const r = run();
  applyRunAction(r, action("hint"), 1000);
  applyRunAction(r, action("answer", { answer: "A" }), 2000);
  assert.equal(learningResult(r).score, 10);
  assert.equal(learningResult(r).independent, 0);
  const guided = run();
  applyRunAction(guided, action("guide"));
  applyRunAction(guided, action("answer", { answer: "A" }));
  assert.equal(learningResult(guided).score, 0);
  const open = run();
  open.questions[0].grading = "self_review";
  assert.throws(() => applyRunAction(open, action("answer", { answer: "A" })));
  applyRunAction(open, action("guide"));
  applyRunAction(open, action("understood"));
  assert.equal(learningResult(open).score, null);
});
test("Answer keys stay hidden until solved/guided/finished; malformed navigation and stale questions fail", () => {
  const r = run();
  assert.equal("answer" in runView(r).questions[0], false);
  assert.equal("checks" in runView(r).questions[0], false);
  assert.equal(runView(r).questions[0].solution, undefined);
  assert.throws(() => applyRunAction(r, action("go", { index: 8 })));
  assert.throws(() =>
    applyRunAction(r, action("hint", { questionId: "unknown" })),
  );
  applyRunAction(r, action("answer", { answer: "A" }));
  assert.equal(runView(r).questions[0].solution?.answer, "A");
  applyRunAction(r, action("finish"));
  assert.throws(() => applyRunAction(r, action("hint")));
});
test("Pack planning honors count and topics, excludes missing audio, and does not leak private learning data", () => {
  const j = job();
  const q = j.batches[0].result!.questions[0];
  q.prompt = "Listen and tick";
  j.learning = preparePack(j, { count: 25, topics: [] });
  assert.equal(
    j.learning.parts
      .filter((p) => p.kind === "practice")
      .reduce((n, p) => n + p.count, 0),
    25,
  );
  assert.equal(j.learning.parts[0].skipped.length, 1);
  assert.equal("learning" in publicDocument(j), false);
  assert.throws(() =>
    preparePack(
      { ...j, learning: undefined },
      { count: 25, topics: ["Không có"] },
    ),
  );
});
test("Stored shared runs resume across browsers and survive pack replacement", async () => {
  const j = job();
  j.learning = preparePack(j, { count: 5, topics: [] });
  const p = j.learning.parts.find((p) => p.kind === "practice")!;
  p.done = true;
  p.questions = [question()];
  j.learning.status = "partial";
  await writeJob(j);
  const first = await startLearningRun(j.id, j.owner, { kind: "practice" });
  const second = await startLearningRun(j.id, j.owner, { kind: "practice" });
  assert.equal(first.id, second.id);
  assert.equal((await readRun(j.id, first.id, "other-owner")).id, first.id);
  await changeRun(j.id, first.id, j.owner, action("answer", { answer: "A" }));
  await updateJob(j.id, (x) => {
    delete x.learning;
  });
  assert.equal(
    (await readRun(j.id, first.id, j.owner)).questions[0].answer,
    "A",
  );
  await changeRun(j.id, first.id, j.owner, action("finish"));
  assert.equal(
    (await learningView(await readJob(j.id), j.owner)).runs[0].score,
    10,
  );
});
test("Generation integrates schema + independent review, repairs rejected answers, preserves successful parts on retry", async () => {
  const j = job();
  j.learning = preparePack(j, { count: 5, topics: [] });
  await writeJob(j);
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-only";
  let reviews = 0;
  let generationCalls = 0;
  try {
    globalThis.fetch = async (_url, init) => {
      const b = JSON.parse(init!.body as string);
      const user = b.messages[1].content[0].text;
      let result;
      if (b.response_format.json_schema.name === "teaching_review") {
        const data = JSON.parse(user);
        reviews++;
        assert.ok(
          data.questions.every(
            (q: Record<string, unknown>) =>
              !("answer" in q) && !("steps" in q) && !("hints" in q),
          ),
        );
        assert.equal(b.max_tokens, 5000);
        result = {
          reviews: data.questions.map((q: LearningQuestion) => ({
            id: q.id,
            valid: true,
            answer: reviews === 1 ? "B" : "A",
            reason: reviews === 1 ? "Hãy kiểm tra phép cộng." : "",
          })),
        };
      } else {
        generationCalls++;
        const original = user.startsWith("Giải các câu gốc");
        const ids = original
          ? ["page-1-0"]
          : [
              "practice-1",
              "practice-2",
              "practice-3",
              "practice-4",
              "practice-5",
            ];
        result = {
          questions: ids.map((id, i) => ({
            ...question(id),
            sourceIds: ["page-1-0"],
            prompt: original ? "2 + 3 = ?" : `${i + 10} + 3 = ?`,
            options: original
              ? question().options
              : [
                  { label: "A", text: String(i + 13) },
                  { label: "B", text: String(i + 14) },
                  { label: "C", text: String(i + 15) },
                ],
            advanced: !original && i === 4,
            checks: original
              ? [{ expression: "2+3", value: 5 }]
              : [{ expression: `${i + 10}+3`, value: i + 13 }],
          })),
          skipped: [],
        };
      }
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(result) },
          },
        ],
      });
    };
    await processLearning(j.id);
    const stored = await readJob(j.id);
    assert.equal(stored.learning?.status, "ready");
    assert.equal(
      stored.learning?.parts
        .filter((p) => p.kind === "practice")
        .flatMap((p) => p.questions).length,
      5,
    );
    assert.equal(generationCalls, 3);
    assert.equal(reviews, 3);
    await updateJob(j.id, (x) => {
      x.learning!.status = "partial";
      const p = x.learning!.parts.find((p) => p.kind === "practice")!;
      p.done = false;
      p.questions = [];
      p.error = "Test retry";
      x.learning = preparePack(x, { count: 5, topics: [], retry: true });
    });
    generationCalls = 0;
    await processLearning(j.id);
    assert.equal(generationCalls, 1);
    assert.equal((await readJob(j.id)).learning?.status, "ready");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("Shared lessons, attempts and history work across browsers; source mutations stay creator-only", async () => {
  const token = "a".repeat(64);
  const j = job();
  j.owner = createHash("sha256").update(token).digest("hex");
  j.learning = preparePack(j, { count: 5 });
  j.learning.status = "ready";
  for (const p of j.learning.parts) {
    p.done = true;
    p.questions = [
      question(p.kind === "practice" ? "practice-1" : p.sourceIds[0]),
    ];
  }
  await writeJob(j);
  async function call(
    parts: string[],
    body?: unknown,
    cookie = token,
    origin = "http://localhost:3100",
  ) {
    const req = new NextRequest(
      "http://localhost:3100/api/documents/" + parts.join("/"),
      {
        method: body === undefined ? "GET" : "POST",
        headers: {
          cookie: `vuihoc-library=${cookie}`,
          origin,
          "content-type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    return (body === undefined ? GET : POST)(req, {
      params: Promise.resolve({ parts }),
    });
  }
  const doc = await (await call([j.id])).json();
  assert.equal(doc.learning, undefined);
  const info = await (await call([j.id, "learning"])).json();
  assert.equal(info.pack.parts, undefined);
  assert.equal(
    (await call([j.id, "learning"], undefined, "b".repeat(64))).status,
    200,
  );
  assert.equal(
    (
      await call(
        [j.id, "runs"],
        { kind: "practice" },
        token,
        "https://foreign.example",
      )
    ).status,
    403,
  );
  const created = await (
    await call([j.id, "runs"], { kind: "practice" })
  ).json();
  assert.equal(created.questions[0].solution, undefined);
  assert.equal(created.questions[0].answer, undefined);
  assert.equal("owner" in created, false);
  const visitorToken = "b".repeat(64);
  const visitorResponse = await call(
    [j.id, "runs"],
    { kind: "practice" },
    visitorToken,
  );
  assert.equal(visitorResponse.status, 200);
  const visitorRun = await visitorResponse.json();
  assert.equal(visitorRun.id, created.id);
  const resumed = await (
    await call([j.id, "runs"], { kind: "practice" }, visitorToken)
  ).json();
  assert.equal(resumed.id, created.id);
  assert.equal((await call([j.id, "runs", visitorRun.id])).status, 200);
  const independent = await (
    await call(
      [j.id, "runs"],
      { kind: "practice", resume: false },
      visitorToken,
    )
  ).json();
  assert.notEqual(independent.id, created.id);
  assert.equal(
    (await call([j.id, "runs", independent.id], action("finish"))).status,
    200,
  );
  assert.equal(
    (await call([j.id, "generate"], { count: 5, topics: [] }, visitorToken))
      .status,
    404,
  );

  const route = [j.id, "runs", created.id];
  const first = await (
    await call(
      route,
      action("answer", { questionId: "practice-1", answer: "B" }),
    )
  ).json();
  assert.equal(first.result.firstCorrect, 0);
  assert.equal(first.questions[0].solution, undefined);
  const correct = await (
    await call(
      route,
      action("answer", { questionId: "practice-1", answer: "A" }),
      visitorToken,
    )
  ).json();
  assert.equal(correct.result.firstCorrect, 0);
  assert.equal(correct.questions[0].solution.answer, "A");
  assert.equal((await call(route, undefined, visitorToken)).status, 200);
  const history = await (await call(["history"])).json();
  const visitorHistory = await (
    await call(["history"], undefined, visitorToken)
  ).json();
  assert.deepEqual(visitorHistory, history);
  assert.ok(history.runs.some((r: { id: string }) => r.id === created.id));
  assert.ok(history.runs.some((r: { id: string }) => r.id === independent.id));
  const shared = await (await call(route, undefined, visitorToken)).json();
  assert.equal(shared.result.solved, 1);
  assert.equal(shared.questions[0].solution.answer, "A");
  // Both historical formats remain accessible without migrating existing data.
  const legacyPath = path.join(
    dir,
    "documents",
    j.id,
    "runs",
    `${created.id}.json`,
  );
  const legacy = JSON.parse(await fs.readFile(legacyPath, "utf8"));
  for (const oldOwner of [j.owner, undefined]) {
    legacy.owner = oldOwner;
    await fs.writeFile(legacyPath, JSON.stringify(legacy));
    const response = await (await call(route, undefined, visitorToken)).json();
    assert.equal(response.id, created.id);
    assert.equal("owner" in response, false);
  }
  const thirdBrowser = await (
    await call(["history"], undefined, "c".repeat(64))
  ).json();
  assert.deepEqual(thirdBrowser, history);
  const anotherDocument = job();
  await writeJob(anotherDocument);
  assert.equal(
    (await call([anotherDocument.id, "runs", created.id])).status,
    404,
  );
  await updateJob(j.id, (doc) => {
    doc.files[0].uploaded = false;
  });
  assert.equal((await call(route, undefined, visitorToken)).status, 404);
  assert.equal((await call(route)).status, 200);
});

test("Repeatedly rejected source questions are flagged without discarding verified siblings", async () => {
  const j = job();
  j.batches[0].result!.questions.push({
    ...j.batches[0].result!.questions[0],
    label: "Câu 2",
    prompt: "3 + 3 = ?",
  });
  const sources = publicDocument(j).questions;
  const pack = preparePack(j, { count: 5 });
  const originalFetch = globalThis.fetch;
  const key = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test";
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options!.body));
    calls++;
    const output =
      body.response_format.json_schema.name === "learning_content"
        ? {
            questions: sources.map((s) => ({
              ...question(s.id),
              sourceIds: [s.id],
            })),
            skipped: [],
          }
        : {
            reviews: sources.map((s, i) => ({
              id: s.id,
              valid: i === 0,
              answer: "A",
              reason: i === 0 ? "" : "Đáp án chưa khớp dữ kiện.",
            })),
          };
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(output) },
          },
        ],
      }),
    );
  };
  try {
    const result = await buildPart(j, pack, pack.parts[0]);
    assert.equal(calls, 4);
    assert.deepEqual(
      result.questions.map((q) => q.id),
      [sources[0].id],
    );
    assert.equal(result.skipped[0].sourceId, sources[1].id);
    assert.match(result.skipped[0].reason, /kiểm tra nội dung/);
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = key;
  }
});

test("Digit enumeration verifies complete lists and count against the chosen answer", () => {
  const q = question("practice-13");
  q.prompt =
    "Từ các chữ số 2; 3; 5; 8, hãy viết tất cả các số lẻ có 2 chữ số khác nhau.";
  q.options = [
    { label: "A", text: "23, 25, 35, 53, 83" },
    { label: "B", text: "23, 25, 28, 35, 53, 83" },
    { label: "C", text: "23, 25, 35, 53, 58, 83" },
  ];
  assert.throws(() => validateTeaching(q, [1], ["source1"], false), /85/);
  q.options[0].text += " , 85";
  validateTeaching(q, [1], ["source1"], false);
  q.prompt =
    "Từ các chữ số 1; 5; 6; 8, viết được bao nhiêu số chẵn có 2 chữ số?";
  q.options = [
    { label: "A", text: "6 số" },
    { label: "B", text: "8 số" },
    { label: "C", text: "12 số" },
  ];
  q.answer = "C";
  assert.throws(() => validateTeaching(q, [1], ["source1"], false), /8 số/);
  q.answer = "B";
  validateTeaching(q, [1], ["source1"], false);
});

test("Unlabelled word banks are accepted for self review but never as automatic choices", () => {
  const q = question();
  q.grading = "self_review";
  q.options = [
    { label: "", text: "xanh" },
    { label: "", text: "đỏ" },
  ];
  validateTeaching(q, [1], ["source1"], false);
  q.grading = "choice";
  assert.throws(() => validateTeaching(q, [1], ["source1"], false));
});
