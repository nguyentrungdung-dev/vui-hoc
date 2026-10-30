import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { LearningQuestion, LearningRun } from "../lib/learning";
import { runView } from "../lib/learning";
import type { DocumentJob } from "../lib/documents";
import {
  BANK_POLICY,
  bankContentKey,
  practiceBankProfile,
  similarBankProfile,
} from "./question-bank-profile";
import {
  publishBankQuestion,
  takeBankQuestion,
  quarantineBankQuestion,
  acquireBankFills,
  markBankQuestionsSeen,
  assertBankQuestionsActive,
  reportGeneratedQuestion,
  type BankAudit,
} from "./question-bank";
import { buildPart, preparePack } from "./generation";
import { writeJob, readJob } from "./store";
import { startLearningRun, readWorkflowRun } from "./learning-runs";
import {
  requestSimilar,
  generateSimilarQuestion,
  similarDispatcher,
} from "./similar";
const root = mkdtempSync(path.join(os.tmpdir(), "vuihoc-question-bank-"));
process.env.VUIHOC_DATA_DIR = root;
after(() => fs.rm(root, { recursive: true, force: true }));
const audit: BankAudit = {
  pipeline: "practice",
  model: "test",
  at: new Date().toISOString(),
  independentlySolved: true,
  consistent: true,
};
const seed = {
  text: "Bài học: cộng trong phạm vi 100. Tính tổng hai số.",
  topics: ["Cộng"],
};
const profile = () =>
  practiceBankProfile("math", "weekly", seed, "Cộng", false, false);
function question(n = 20): LearningQuestion {
  return {
    id: "q",
    label: "Câu 1",
    sourceIds: [],
    sourcePages: [1],
    topic: "Cộng",
    prompt: `${n} + 1 = ?`,
    passage: "",
    options: [
      { label: "A", text: String(n + 1) },
      { label: "B", text: String(n + 2) },
      { label: "C", text: String(n + 3) },
    ],
    hasFigure: false,
    figureDescription: "",
    advanced: false,
    translation: "",
    grading: "choice",
    answer: "A",
    acceptedAnswers: [],
    hints: ["Xem phép cộng.", "Thêm một đơn vị.", "Đếm tiếp một đơn vị."],
    steps: ["Thêm một đơn vị.", `Kết quả là ${n + 1}.`],
    explanation: "Cộng thêm một đơn vị.",
    englishSteps: [],
    checks: [{ expression: `${n}+1`, value: n + 1 }],
    contentVersion: 2,
    inputKind: "multiple_choice",
    answerFields: [],
    rubric: [],
  };
}
function source(owner: string, page = 1): DocumentJob {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: "Cộng",
    owner,
    subject: "math",
    mode: "weekly",
    practiceCount: 5,
    files: [
      {
        name: "source.pdf",
        mime: "application/pdf",
        uploaded: true,
        size: 100,
      },
    ],
    pageRange: "",
    createdAt: now,
    updatedAt: now,
    status: "complete",
    message: "",
    totalPages: page,
    selectedPages: [page],
    completedPages: [page],
    model: "test",
    quickPractice: { sourceDocumentId: randomUUID(), waitingForSource: false },
    batches: [
      {
        key: "p",
        pages: [page],
        result: {
          summary: "Cộng",
          pages: [{ ...seed, page, issues: [] }],
          questions: [],
        },
      },
    ],
  };
}

test("Profiles separate subjects, difficulty, format, language and context; only explicit arithmetic forms generalize", () => {
  const a = question(27);
  a.prompt = "27 + 16 = ?";
  const b = { ...a, prompt: "36 + 18 = ?" };
  assert.equal(
    similarBankProfile("math", "weekly", a, "same", 0, []).key,
    similarBankProfile("math", "weekly", b, "same", 0, []).key,
  );
  for (const changed of [
    { ...a, prompt: "Tìm x: x + 16 = 43" },
    {
      ...a,
      prompt: "Đặt tính rồi tính",
      answerFields: [{ id: "a", label: "27 + 16" }],
    },
    { ...a, prompt: "27 + 12 = ?" },
    { ...a, passage: "Có một hộp bi." },
  ])
    assert.notEqual(
      similarBankProfile("math", "weekly", a, "same", 0, []).key,
      similarBankProfile("math", "weekly", changed, "same", 0, []).key,
    );
  assert.notEqual(
    similarBankProfile("math", "weekly", a, "same", 0, []).key,
    similarBankProfile("math", "weekly", a, "harder", 0, []).key,
  );
  assert.notEqual(
    practiceBankProfile("math", "weekly", seed, "Cộng", false, false).key,
    practiceBankProfile("english", "weekly", seed, "Cộng", false, false).key,
  );
  assert.notEqual(
    practiceBankProfile("math", "weekly", seed, "Cộng", false, false).key,
    practiceBankProfile("math", "timo", seed, "Cộng", false, true).key,
  );
  const english = {
    ...a,
    prompt: "Write short answers: Do you play football?",
  };
  assert.notEqual(
    similarBankProfile("english", "weekly", english, "same", 0, []).key,
    similarBankProfile(
      "english",
      "weekly",
      { ...english, prompt: "Choose: Do you play football?" },
      "same",
      0,
      [],
    ).key,
  );
  assert.notEqual(
    similarBankProfile("math", "weekly", a, "progressive", 1, [question(10)])
      .key,
    similarBankProfile("math", "weekly", a, "progressive", 1, [question(11)])
      .key,
  );
});

test("Only approved self-contained questions enter the bank; duplicate content and learner delivery are indexed separately", async () => {
  const p = profile();
  await assert.rejects(
    publishBankQuestion(
      p,
      { ...question(), grading: "ungraded" },
      "publisher",
      "bad",
      audit,
    ),
    /BANK_APPROVAL/,
  );
  await assert.rejects(
    publishBankQuestion(
      p,
      { ...question(), hasFigure: true },
      "publisher",
      "bad",
      audit,
    ),
    /BANK_APPROVAL/,
  );
  const q1 = await publishBankQuestion(
    p,
    question(60),
    "publisher",
    "one",
    audit,
  );
  const q2 = await publishBankQuestion(
    p,
    question(61),
    "publisher",
    "two",
    audit,
  );
  assert.equal(await takeBankQuestion(p, "publisher", "new"), null);
  const reused = await takeBankQuestion(p, "student-A", "slot1");
  assert.ok(reused?.bank?.reused);
  assert.equal(
    (await takeBankQuestion(p, "student-A", "slot1"))?.bank?.contentKey,
    reused.bank.contentKey,
  );
  const second = await takeBankQuestion(p, "student-A", "slot2");
  assert.ok(second && second.bank?.contentKey !== reused.bank.contentKey);
  assert.equal(await takeBankQuestion(p, "student-A", "slot3"), null);
  assert.ok(
    [q1.bank!.contentKey, q2.bank!.contentKey].includes(reused.bank.contentKey),
  );
  await markBankQuestionsSeen("student-B", [q1, q2]);
  assert.equal(await takeBankQuestion(p, "student-B", "new"), null);
  await assert.rejects(
    publishBankQuestion(p, question(60), "publisher", "repeat", audit),
    /BANK_REPEAT/,
  );
  assert.equal(
    (await fs.readdir(path.join(root, "question-bank", "items"))).length,
    2,
  );
});

test("Quarantined and old-policy entries are excluded, including existing allocations, and cannot resurrect on a duplicate insert", async () => {
  const p = practiceBankProfile(
    "math",
    "weekly",
    { text: "Quarantine fixture", topics: ["Cộng"] },
    "Cộng",
    false,
    false,
  );
  const q = await publishBankQuestion(
    p,
    question(65),
    "teacher",
    "seed",
    audit,
  );
  await takeBankQuestion(p, "student-Q", "slot");
  await assertBankQuestionsActive([q]);
  await quarantineBankQuestion(q.bank!.contentKey, "Sai đáp án");
  await assert.rejects(assertBankQuestionsActive([q]), /cần kiểm tra/);
  assert.equal(await takeBankQuestion(p, "student-Q", "slot"), null);
  assert.equal(await takeBankQuestion(p, "new-student", "slot"), null);
  await assert.rejects(
    publishBankQuestion(p, question(65), "teacher", "seed2", audit),
    /BANK_QUARANTINED/,
  );
  const active = await publishBankQuestion(
    p,
    question(66),
    "teacher",
    "seed3",
    audit,
  );
  const target = path.join(
    root,
    "question-bank",
    "items",
    active.bank!.contentKey + ".json",
  );
  const raw = JSON.parse(await fs.readFile(target, "utf8"));
  raw.policy = "obsolete";
  await fs.writeFile(target, JSON.stringify(raw));
  assert.equal(await takeBankQuestion(p, "new-student", "slot"), null);
  assert.equal(
    await takeBankQuestion({ ...p, policy: "obsolete" }, "new-student", "slot"),
    null,
  );
});

test("Expiring fill leases let concurrent learners reuse one newly generated question without holding a database transaction across AI", async () => {
  const p = practiceBankProfile(
    "math",
    "weekly",
    { text: "Concurrency fixture", topics: ["Cộng"] },
    "Cộng",
    false,
    false,
  );
  let generated = 0;
  async function work(owner: string) {
    let q = await takeBankQuestion(p, owner, "slot");
    if (q) return q;
    const release = await acquireBankFills([p]);
    try {
      q = await takeBankQuestion(p, owner, "slot");
      if (q) return q;
      generated++;
      await new Promise((r) => setTimeout(r, 20));
      return publishBankQuestion(p, question(70), owner, "slot", audit);
    } finally {
      await release();
    }
  }
  const [a, b] = await Promise.all([
    work("concurrent-A"),
    work("concurrent-B"),
  ]);
  assert.equal(generated, 1);
  assert.equal(a!.bank!.contentKey, b!.bank!.contentKey);
});

function generationMock() {
  const requested: number[] = [];
  const stub = mock.method(
    globalThis,
    "fetch",
    async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)),
        name = body.response_format.json_schema.name;
      let output;
      if (name === "learning_content") {
        const payload = JSON.parse(
          body.messages[1].content[0].text.split("\nNguồn: ")[1].split("\n")[0],
        );
        requested.push(payload.assignments.length);
        output = {
          questions: payload.assignments.map(
            (a: {
              id: string;
              topic: string;
              sourcePage: number;
              advanced: boolean;
            }) => {
              const q = question(80 + Number(a.id.split("-")[1]));
              const {
                bank: _b,
                contentVersion: _v,
                inputKind: _i,
                answerFields: _f,
                ...draft
              } = q;
              return {
                ...draft,
                id: a.id,
                label: a.id,
                sourcePages: [a.sourcePage],
                topic: a.topic,
                advanced: a.advanced,
              };
            },
          ),
          skipped: [],
        };
      } else {
        const payload = JSON.parse(body.messages[1].content[0].text);
        output = {
          reviews: payload.questions.map((q: { id: string }) => ({
            id: q.id,
            valid: true,
            reason: "Đã kiểm tra.",
            ...(name === "teaching_review" ? { answer: "A" } : {}),
          })),
        };
      }
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(output) },
          },
        ],
      });
    },
  );
  return { requested, stub };
}

test("Three cached questions plus two missing generates only two, then another learner gets all five with zero AI and rebound page IDs", async () => {
  const j = source("learner-partial");
  const pack = preparePack(j, { count: 5 });
  const part = pack.parts.find((p) => p.kind === "practice")!;
  // This fixture has a unique profile, independent of other tests.
  j.batches[0].result!.pages[0].text += " Partial-cache fixture.";
  const p = practiceBankProfile(
    "math",
    "weekly",
    { text: j.batches[0].result!.pages[0].text, topics: seed.topics },
    "Cộng",
    false,
    false,
  );
  for (let i = 0; i < 3; i++)
    await publishBankQuestion(
      p,
      question(73 + i),
      "fixture-teacher",
      `partial-${i}`,
      audit,
    );
  const oldKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test";
  const control = generationMock();
  try {
    const first = await buildPart(j, pack, part);
    assert.equal(first.questions.length, 5);
    assert.equal(first.questions.filter((q) => q.bank?.reused).length, 3);
    assert.deepEqual(control.requested, [2]);
    assert.deepEqual(
      first.questions.map((q) => q.id),
      ["practice-1", "practice-2", "practice-3", "practice-4", "practice-5"],
    );
    const beforeCalls = control.stub.mock.calls.length;
    const other = source("learner-all-cached", 7);
    other.batches[0].result!.pages[0].text = j.batches[0].result!.pages[0].text;
    delete process.env.OPENROUTER_API_KEY;
    const pack2 = preparePack(other, { count: 5 });
    const second = await buildPart(
      other,
      pack2,
      pack2.parts.find((p) => p.kind === "practice")!,
    );
    assert.equal(control.stub.mock.calls.length, beforeCalls);
    assert.ok(
      second.questions.every(
        (q) =>
          q.bank?.reused && q.sourcePages[0] === 7 && q.sourceIds.length === 0,
      ),
    );
    const run: LearningRun = {
      owner: other.owner,
      id: randomUUID(),
      documentId: other.id,
      packId: pack2.id,
      title: "Cache",
      mode: "weekly",
      kind: "practice",
      questions: second.questions,
      attempts: {},
      index: 0,
      finished: false,
      createdAt: other.createdAt,
      updatedAt: other.updatedAt,
      eventIds: [],
    };
    assert.ok(
      runView(run).questions.every(
        (q) =>
          !("bank" in q) && !("answer" in q) && !("generationApproval" in q),
      ),
    );
  } finally {
    control.stub.mock.restore();
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
});

test("The difficulty-based five-question path reuses approved questions with no AI, hides bank metadata and quarantines learner reports", async () => {
  const j = source("similar-owner-A");
  delete j.quickPractice;
  const q = {
    ...question(17),
    id: "p-0",
    sourceIds: ["p-0"],
    sourcePages: [1],
  };
  j.batches[0].result!.questions = [
    {
      id: q.id,
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
      answerFields: [],
      needsReview: false,
      issues: [],
    } as never,
  ];
  j.learning = {
    ...preparePack(j, { count: 0, scope: "original" }),
    status: "ready",
  };
  j.learning.parts[0].done = true;
  j.learning.parts[0].questions = [q];
  await writeJob(j);
  const dispatch = mock.method(similarDispatcher, "start", async () => {});
  const oldKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test";
  const fetcher = mock.method(
    globalThis,
    "fetch",
    async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)),
        payload = JSON.parse(body.messages[1].content[0].text);
      let output;
      if (body.response_format.json_schema.name === "similar_question") {
        const {
          contentVersion: _v,
          inputKind: _i,
          answerFields,
          ...draft
        } = question(18);
        output = { question: draft, answerFields };
      } else
        output = {
          valid: true,
          reason: "Đã giải độc lập.",
          answer: payload.question.answer,
          responseCount: 1,
          sameStructure: true,
          difficultyAppropriate: true,
          difficultyEvidence: "Cùng phép cộng trong phạm vi 100.",
          answerMatches: true,
          answerEvidence: "Đã cộng lại.",
          hintsConsistent: true,
          selfContained: true,
          uniqueAnswer: true,
        };
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(output) },
          },
        ],
      });
    },
  );
  try {
    const parentA = await startLearningRun(j.id, j.owner, { kind: "original" });
    const a = await requestSimilar(j.id, parentA.id, j.owner, {
      questionId: q.id,
      requestId: randomUUID(),
      difficulty: "same",
    });
    const runA = await readWorkflowRun(j.id, a.id);
    assert.equal(
      await generateSimilarQuestion(j.id, a.id, 0, runA.similar!.execution),
      true,
    );
    const calls = fetcher.mock.calls.length;
    assert.equal(calls, 2);
    const parentB = await startLearningRun(j.id, "similar-owner-B", {
      kind: "original",
    });
    delete process.env.OPENROUTER_API_KEY;
    const b = await requestSimilar(j.id, parentB.id, "similar-owner-B", {
      questionId: q.id,
      requestId: randomUUID(),
      difficulty: "same",
    });
    const runB = await readWorkflowRun(j.id, b.id);
    assert.equal(
      await generateSimilarQuestion(j.id, b.id, 0, runB.similar!.execution),
      true,
    );
    assert.equal(fetcher.mock.calls.length, calls);
    const cached = await readWorkflowRun(j.id, b.id);
    assert.equal(cached.questions[0].bank?.reused, true);
    assert.ok(!("bank" in runView(cached).questions[0]));
    await assert.rejects(
      reportGeneratedQuestion(j.id, b.id, "wrong-owner", {
        questionId: cached.questions[0].id,
        reason: "Sai",
      }),
    );
    const before = JSON.stringify(cached);
    await reportGeneratedQuestion(j.id, b.id, "similar-owner-B", {
      questionId: cached.questions[0].id,
      reason: "Cần kiểm tra đáp án",
    });
    assert.equal(JSON.stringify(await readWorkflowRun(j.id, b.id)), before);
    const p = similarBankProfile(j.subject, "weekly", q, "same", 0, []);
    assert.equal(await takeBankQuestion(p, "next-student", "new-slot"), null);
  } finally {
    dispatch.mock.restore();
    fetcher.mock.restore();
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
});

test("Contradictory closed answers quarantine the content instead of silently replacing its grading key", async () => {
  const p = practiceBankProfile(
    "math",
    "weekly",
    { text: "Conflicting answer fixture", topics: ["Cộng"] },
    "Cộng",
    false,
    false,
  );
  const q = await publishBankQuestion(
    p,
    question(97),
    "conflict-teacher",
    "first",
    audit,
  );
  await assert.rejects(
    publishBankQuestion(
      p,
      { ...question(97), answer: "B" },
      "conflict-teacher",
      "second",
      audit,
    ),
    /BANK_ANSWER_CONFLICT/,
  );
  assert.equal(await takeBankQuestion(p, "conflict-learner", "slot"), null);
  await assert.rejects(assertBankQuestionsActive([q]), /cần kiểm tra/);
});
