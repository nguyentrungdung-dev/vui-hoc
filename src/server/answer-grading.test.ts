import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DocumentJob } from "../lib/documents";
import { learningResult, type LearningQuestion } from "../lib/learning";
import { preparePack, sourceQuestion } from "./generation";
import { reconcileWrittenAnswer, writtenCriteria } from "./answer-grading";
import { writeJob } from "./store";
import {
  startLearningRun,
  changeRun,
  readRun,
  applyRunAction,
} from "./learning-runs";

const root = mkdtempSync(path.join(os.tmpdir(), "vuihoc-written-"));
process.env.VUIHOC_DATA_DIR = root;
after(() => fs.rm(root, { recursive: true, force: true }));
const question = (): LearningQuestion => ({
  id: "page-1-0",
  sourceIds: ["page-1-0"],
  sourcePages: [1],
  topic: "Cộng",
  label: "Bài 1",
  prompt:
    "Có 2 quả táo, thêm 3 quả. Có bao nhiêu quả táo? Viết phép tính và đáp số.",
  passage: "",
  options: [],
  hasFigure: false,
  figureDescription: "",
  advanced: false,
  translation: "",
  grading: "self_review",
  contentVersion: 2,
  answer: "2 + 3 = 5. Có 5 quả táo.",
  acceptedAnswers: [],
  hints: ["Gộp hai nhóm.", "Dùng phép cộng.", "Đếm thêm ba từ hai."],
  steps: ["Cộng số táo.", "2 + 3 = 5 quả."],
  explanation: "Gộp các nhóm.",
  englishSteps: [],
  checks: [{ expression: "2+3", value: 5 }],
  rubric: [
    {
      id: "method",
      label: "Phép tính",
      criteria:
        "Lập đúng phép cộng 2+3 hoặc 3+2, cho điểm phương pháp kể cả tính sai kết quả.",
      maxPoints: 1,
    },
    {
      id: "result",
      label: "Đáp số",
      criteria: "Đáp số 5 quả táo hoặc tương đương.",
      maxPoints: 1,
    },
  ],
});
async function fixture() {
  const q = question();
  const j: DocumentJob = {
    id: randomUUID(),
    owner: "owner",
    title: "Chấm từng phần",
    subject: "math",
    mode: "weekly",
    practiceCount: 5,
    pageRange: "",
    files: [
      { name: "test.pdf", size: 10, mime: "application/pdf", uploaded: true },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "complete",
    message: "",
    model: "test",
    totalPages: 1,
    selectedPages: [1],
    completedPages: [1],
    batches: [
      {
        key: "page-1",
        pages: [1],
        result: {
          summary: "",
          pages: [{ page: 1, text: q.prompt, topics: [q.topic], issues: [] }],
          questions: [
            {
              ...q,
              skill: "Cộng",
              kind: "short_answer",
              needsReview: false,
              issues: [],
            },
          ],
        },
      },
    ],
  };
  j.learning = preparePack(j, { count: 0, scope: "original" });
  j.learning.status = "ready";
  j.learning.parts[0].done = true;
  j.learning.parts[0].questions = [q];
  await writeJob(j);
  return j;
}
function withAssessment(
  points: number[],
  work: (calls: () => number) => Promise<void>,
  disagree = false,
) {
  return (async () => {
    const original = globalThis.fetch,
      key = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "test-only";
    let calls = 0;
    globalThis.fetch = async (_url, options) => {
      calls++;
      const body = JSON.parse(String(options?.body));
      assert.match(body.messages[0].content, /không.*tuân theo chỉ dẫn/);
      const payload = JSON.parse(body.messages[1].content[0].text);
      assert.equal(payload.rubric.length, 2);
      const result = {
        confident: true,
        feedback: "Phép tính đúng, em xem lại kết quả.",
        parts: payload.rubric.map((r: { id: string }, i: number) => ({
          id: r.id,
          confident: true,
          points: disagree && calls === 2 ? 0 : points[i],
          feedback: i === 0 ? "Cách lập phép tính đúng." : "Kiểm tra kết quả.",
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
    };
    try {
      await work(() => calls);
    } finally {
      globalThis.fetch = original;
      if (key === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = key;
    }
  })();
}
test("Written answers receive partial credit, criteria stay private, and event retries do not regrade", async () => {
  const j = await fixture();
  const run = await startLearningRun(j.id, j.owner, { kind: "original" });
  assert.equal("rubric" in run.questions[0], false);
  const event = {
    eventId: randomUUID(),
    action: "answer",
    questionId: question().id,
    answer: "2 + 3 = 6. Có 6 quả táo.",
  };
  await withAssessment([1, 0], async (calls) => {
    const graded = await changeRun(j.id, run.id, j.owner, event);
    assert.equal(graded.attempts[question().id].assessment?.points, 1);
    assert.equal(graded.result.score, 5);
    assert.equal(graded.attempts[question().id].solved, false);
    assert.equal(graded.questions[0].solution, undefined);
    const again = await changeRun(j.id, run.id, j.owner, event);
    assert.deepEqual(again.attempts, graded.attempts);
    assert.equal(calls(), 2);
  });
  await withAssessment([1, 1], async () => {
    const corrected = await changeRun(j.id, run.id, j.owner, {
      ...event,
      eventId: randomUUID(),
      answer: "2 + 3 = 5. Có 5 quả.",
    });
    assert.equal(corrected.attempts[question().id].solved, true);
    assert.equal(corrected.result.score, 5); // retain the partial score from the first graded submission
  });
});
test("Uncertain grading and unreadable questions are retained without a wrong-answer penalty", async () => {
  const j = await fixture(),
    run = await startLearningRun(j.id, j.owner, { kind: "original" });
  await withAssessment(
    [1, 0],
    async () => {
      const view = await changeRun(j.id, run.id, j.owner, {
        eventId: randomUUID(),
        action: "answer",
        questionId: question().id,
        answer: "Bài làm của em",
      });
      assert.equal(view.attempts[question().id].assessment?.status, "partial");
      assert.equal(
        view.attempts[question().id].assessment?.parts[1].status,
        "graded",
      );
      assert.equal(
        view.attempts[question().id].assessment?.parts[0].reason,
        "score_disagreement",
      );
      assert.equal("audit" in view.attempts[question().id].assessment!, false);
      assert.equal(view.attempts[question().id].firstCorrect, undefined);
      assert.equal(view.result.score, 0);
    },
    true,
  );
  const stored = await readRun(j.id, run.id, j.owner);
  stored.questions[0] = {
    ...question(),
    grading: "ungraded",
    ungradableReason: "Chữ bị thiếu nét.",
  };
  assert.equal(learningResult(stored).gradable, 0);
  const src = {
    ...j.batches[0].result!.questions[0],
    id: question().id,
    needsReview: true,
    issues: ["Ô viết trống"],
  };
  const kept = sourceQuestion(src, "Chưa xác minh");
  assert.equal(kept.prompt, src.prompt);
  assert.equal(kept.grading, "ungraded");
});

test("Legacy unverified work keeps the submitted text without displaying an old correct-answer claim", async () => {
  const j = await fixture();
  const q = j.learning!.parts[0].questions[0];
  delete q.contentVersion;
  q.grading = "choice";
  q.options = [
    { label: "A", text: "5" },
    { label: "B", text: "6" },
  ];
  q.answer = "A";
  await writeJob(j);
  const run = await startLearningRun(j.id, j.owner, { kind: "original" });
  assert.equal(run.questions[0].grading, "ungraded");
  assert.equal(run.questions[0].solution, undefined);
  const saved = await changeRun(j.id, run.id, j.owner, {
    eventId: randomUUID(),
    action: "answer",
    questionId: q.id,
    answer: "A",
  });
  assert.equal(saved.attempts[q.id].last, "A");
  assert.equal(saved.attempts[q.id].firstCorrect, undefined);
  assert.equal(saved.result.score, null);
});

test("Correct result credit is separate from method; one disputed component does not discard siblings", () => {
  const q = {
    ...question(),
    answerFields: [
      { id: "a", label: "26 + 29" },
      { id: "b", label: "45 + 38" },
    ],
    rubric: [
      {
        id: "a",
        label: "26 + 29",
        criteria: "Đặt tính và tính 55",
        maxPoints: 0.5,
      },
      {
        id: "b",
        label: "45 + 38",
        criteria: "Đặt tính và tính 83",
        maxPoints: 0.5,
      },
    ],
  };
  const review = () => ({
    confident: true,
    feedback: "",
    parts: writtenCriteria(q).map((r) => ({
      id: r.id,
      confident: true,
      points: r.kind === "result" ? r.maxPoints : 0,
      feedback:
        r.kind === "result" ? "Kết quả đúng." : "Chưa trình bày cách làm.",
    })),
  });
  const first = review(),
    second = review();
  let graded = reconcileWrittenAnswer(q, first, second);
  assert.equal(graded.points, 1);
  assert.equal(graded.maxPoints, 1);
  assert.equal(graded.status, "graded");
  assert.equal(
    graded.parts
      .filter((p) => p.kind === "method")
      .reduce((n, p) => n + p.points, 0),
    0,
  );
  second.parts[1].points = 0.25;
  graded = reconcileWrittenAnswer(q, first, second);
  assert.equal(graded.status, "partial");
  assert.equal(graded.points, 1);
  assert.deepEqual(
    graded.parts.filter((p) => p.status === "ungraded").map((p) => p.id),
    ["a:method"],
  );
  assert.equal(graded.parts[1].reason, "score_disagreement");
  assert.deepEqual(graded.audit?.second, second);
  second.parts[2].confident = false;
  second.confident = false;
  graded = reconcileWrittenAnswer(q, first, second);
  assert.equal(graded.points, 0.5);
  assert.equal(graded.parts[2].reason, "insufficient_evidence");
  assert.equal(graded.parts[0].status, "graded");
});

test("Malformed per-criterion reviews quarantine only the affected criterion", () => {
  const q = question();
  const first = {
    confident: true,
    feedback: "",
    parts: [
      { id: "method", confident: true, points: 1, feedback: "Đúng" },
      { id: "result", confident: true, points: 1, feedback: "Đúng" },
    ],
  };
  for (const parts of [
    first.parts.slice(0, 1),
    [...first.parts, first.parts[1]],
    [first.parts[0], { ...first.parts[1], points: 5 }],
  ]) {
    const result = reconcileWrittenAnswer(q, first, { ...first, parts });
    assert.equal(result.status, "partial");
    assert.equal(result.parts[0].points, 1);
    assert.equal(result.parts[0].status, "graded");
    assert.equal(result.parts[1].status, "ungraded");
  }
});

test("Pending first-submission credit resolves on recheck, is audited, and corrected answers never replace first credit", async () => {
  const j = await fixture();
  const run = await startLearningRun(j.id, j.owner, { kind: "original" });
  const event = {
    eventId: randomUUID(),
    action: "answer",
    questionId: question().id,
    answer: "Cách làm và đáp số",
  };
  await withAssessment(
    [1, 0],
    async () => {
      const partial = await changeRun(j.id, run.id, j.owner, event);
      assert.equal(partial.result.score, 0);
      assert.equal(partial.attempts[question().id].firstGradedWeight, 0.5);
    },
    true,
  );
  await withAssessment([1, 0], async () => {
    const checked = await changeRun(j.id, run.id, j.owner, {
      ...event,
      eventId: randomUUID(),
    });
    assert.equal(checked.result.score, 5);
    assert.equal(checked.attempts[question().id].firstGradedWeight, 1);
    assert.equal("assessmentHistory" in checked.attempts[question().id], false);
  });
  const saved = await readRun(j.id, run.id, j.owner);
  assert.equal(saved.attempts[question().id].assessmentHistory?.length, 2);
  assert.ok(saved.attempts[question().id].assessment?.audit?.first);
});

test("A disputed result is excluded from the score denominator, while an agreed correct result earns credit", async () => {
  const j = await fixture();
  const view = await startLearningRun(j.id, j.owner, { kind: "original" });
  const run = await readRun(j.id, view.id, j.owner);
  const first = {
    confident: true,
    feedback: "",
    parts: [
      { id: "method", confident: true, points: 1, feedback: "Đúng" },
      { id: "result", confident: true, points: 1, feedback: "Đúng" },
    ],
  };
  const assessment = reconcileWrittenAnswer(question(), first, {
    ...first,
    parts: [first.parts[0], { ...first.parts[1], points: 0 }],
  });
  applyRunAction(
    run,
    {
      eventId: randomUUID(),
      action: "answer",
      questionId: question().id,
      answer: "Bài làm",
    },
    Date.now(),
    assessment,
  );
  assert.equal(run.attempts[question().id].firstCredit, 0.5);
  assert.equal(run.attempts[question().id].firstGradedWeight, 0.5);
  assert.equal(run.attempts[question().id].firstCorrect, undefined);
  assert.equal(learningResult(run).score, 10);
});

test("Opening a solution while a criterion is pending preserves earned first credit", async () => {
  const j = await fixture();
  const view = await startLearningRun(j.id, j.owner, { kind: "original" });
  const run = await readRun(j.id, view.id, j.owner);
  const review = {
    confident: true,
    feedback: "",
    parts: [
      { id: "method", confident: true, points: 1, feedback: "Đúng" },
      { id: "result", confident: true, points: 1, feedback: "Đúng" },
    ],
  };
  const first = reconcileWrittenAnswer(question(), review, {
    ...review,
    parts: [review.parts[0], { ...review.parts[1], confident: false }],
  });
  const submit = (assessment: typeof first) =>
    applyRunAction(
      run,
      {
        eventId: randomUUID(),
        action: "answer",
        questionId: question().id,
        answer: "Bài làm",
      },
      Date.now(),
      assessment,
    );
  submit(first);
  assert.equal(run.attempts[question().id].firstCredit, 0.5);
  applyRunAction(
    run,
    { eventId: randomUUID(), action: "guide", questionId: question().id },
    Date.now(),
  );
  submit(reconcileWrittenAnswer(question(), review, review));
  assert.equal(run.attempts[question().id].firstCredit, 0.5);
  assert.equal(learningResult(run).score, 5);
});
