import assert from "node:assert/strict";
import test from "node:test";
import {
  createQuestions,
  newAttempt,
  recordAnswer,
  summarize,
  type Run,
} from "./demo";

test("Retrying a wrong answer does not replace the first answer; hints do not reduce the score", () => {
  const questions = createQuestions(3, ["add"], "weekly");
  const wrongThenRight = recordAnswer(
    recordAnswer(newAttempt(), -1, questions[0].answer),
    questions[0].answer,
    questions[0].answer,
  );
  const hintedRight = recordAnswer(
    { ...newAttempt(), hintOpens: 3, hintMs: 60_000 },
    questions[1].answer,
    questions[1].answer,
  );
  const run: Run = {
    id: "test",
    kind: "practice",
    questions,
    attempts: {
      [questions[0].id]: wrongThenRight,
      [questions[1].id]: hintedRight,
    },
    index: 2,
    finished: true,
    startedAt: 0,
  };
  const result = summarize(run, "Test", 0);
  assert.equal(wrongThenRight.first, -1);
  assert.equal(wrongThenRight.tries, 2);
  assert.equal(result.firstCorrect, 1);
  assert.equal(result.solved, 2);
  assert.equal(result.score, 3.3); // one first-correct, one retry, one skipped
  assert.equal(result.independent, 0);
  assert.equal(result.hints, 3);
});

test("A guided completion without an answer earns no first-answer score", () => {
  const questions = createQuestions(1, ["shape"], "weekly");
  const run: Run = {
    id: "guided",
    kind: "similar",
    questions,
    attempts: {
      [questions[0].id]: {
        ...newAttempt(),
        guided: true,
        solved: true,
        hintOpens: 1,
      },
    },
    index: 0,
    finished: true,
    startedAt: 0,
  };
  const result = summarize(run, "Guided", 0);
  assert.equal(result.score, 0);
  assert.equal(result.solved, 1);
  assert.equal(result.independent, 0);
});

test("Demo fixtures provide a unique correct choice, complete explanations and requested count", () => {
  for (const mode of ["weekly", "timo"] as const) {
    const qs = createQuestions(30, ["add", "story", "shape", "logic"], mode);
    assert.equal(qs.length, 30);
    assert.equal(new Set(qs.map((q) => q.id)).size, 30);
    for (const q of qs) {
      assert.equal(q.options.filter((n) => n === q.answer).length, 1);
      assert.equal(new Set(q.options).size, 4);
      assert.ok(q.hint && q.english && q.steps.length >= 2);
    }
  }
});
