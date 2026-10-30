import { test } from "node:test";
import assert from "node:assert/strict";
import {
  similarContract,
  approveSimilarReview,
  validateSimilarStructure,
  sameSimilarContent,
} from "./similar-policy";
import { buildSimilarQuestion } from "./similar";
import { similarDifficulties } from "../lib/similar";
import type { LearningQuestion } from "../lib/learning";

const source: LearningQuestion = {
  id: "source",
  sourceIds: ["source"],
  sourcePages: [1],
  label: "Câu 1",
  topic: "Số liền trước",
  prompt: "Số liền trước của 69 là:",
  passage: "",
  options: [
    { label: "A", text: "68" },
    { label: "B", text: "70" },
    { label: "C", text: "67" },
    { label: "D", text: "69" },
  ],
  hasFigure: false,
  figureDescription: "",
  advanced: false,
  translation: "",
  grading: "choice",
  answer: "A",
  acceptedAnswers: [],
  hints: ["Tìm số bé hơn một đơn vị.", "Lấy số đã cho trừ 1.", "69 - 1 = 68."],
  steps: ["Lấy 69 trừ 1.", "Chọn đáp án A: 68."],
  explanation: "Số liền trước bé hơn một đơn vị.",
  englishSteps: [],
  checks: [{ expression: "69-1", value: 68 }],
  answerFields: [],
  contentVersion: 2,
};
const review = () => ({
  valid: true,
  reason: "Đạt tất cả điều kiện.",
  answer: "A",
  responseCount: 1,
  sameStructure: true,
  difficultyAppropriate: true,
  difficultyEvidence: "Cùng thao tác trừ một, cùng phạm vi số.",
  answerMatches: true,
  answerEvidence: "69 - 1 = 68, chỉ phương án A bằng 68.",
  hintsConsistent: true,
  selfContained: true,
  uniqueAnswer: true,
});

test("English Yes/No progression uses grammar criteria without imposing arithmetic steps", () => {
  const english = {
    ...source,
    grading: "self_review" as const,
    prompt:
      "Viết câu trả lời ngắn theo gợi ý. Do you go to school by bus? (No)",
    answerFields: [{ id: "a", label: "Do you go to school by bus? (No)" }],
  };
  const contracts = Array.from({ length: 5 }, (_, i) =>
    similarContract(english, "progressive", i),
  );
  assert.match(contracts[0].difficultyRule, /Không thêm chủ ngữ ghép/);
  assert.match(contracts[1].difficultyRule, /MỘT yếu tố ngữ pháp/);
  assert.equal(contracts[1].difficultyRule, contracts[2].difficultyRule);
  assert.match(contracts[2].progressionRule, /không buộc vị trí 3 thêm bước/);
  assert.match(contracts[3].difficultyRule, /do\/does/);
  assert.match(contracts[4].difficultyRule, /ai hỏi, ai trả lời/);
  for (const c of contracts) {
    assert.equal(c.inputFieldCount, 1);
    assert.equal(c.responseCount, 1);
    assert.match(c.progressionRule, /Câu đã lưu thuộc phiên bản cũ/);
  }
  assert.match(
    similarContract(source, "harder", 3).difficultyRule,
    /HAI thao tác/,
  );
  assert.doesNotMatch(
    similarContract(
      { ...english, prompt: "Read and answer the questions." },
      "harder",
      3,
    ).difficultyRule,
    /do\/does/,
  );
  assert.throws(
    () =>
      approveSimilarReview(contracts[2], english, {
        ...review(),
        difficultyAppropriate: false,
      }),
    /DIFFICULTY/,
  );
});

test("A lost AI connection stops without spending two more draft calls", async () => {
  const originalFetch = globalThis.fetch,
    oldKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-only";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("connection lost");
  };
  try {
    await assert.rejects(
      () => buildSimilarQuestion(source, "same", 0, [], "test"),
      /Kết nối AI/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
});

test("Response units are distinct from declared fields for choice, exact and written questions", () => {
  for (const grading of ["choice", "exact", "self_review"] as const) {
    const contract = similarContract({ ...source, grading }, "same", 0);
    assert.equal(contract.inputFieldCount, 0);
    assert.equal(contract.responseCount, 1);
    assert.doesNotThrow(() =>
      approveSimilarReview(contract, { ...source, grading }, review()),
    );
  }
  assert.equal(
    similarContract(
      {
        ...source,
        answerFields: [
          { id: "a", label: "a" },
          { id: "b", label: "b" },
        ],
      },
      "same",
      0,
    ).responseCount,
    2,
  );
});

test("Every requested level and progressive position has an explicit requirement", () => {
  for (const d of similarDifficulties)
    for (let i = 0; i < 5; i++) {
      const c = similarContract(source, d.value, i);
      assert.ok(c.difficultyRule.length > 40);
      assert.equal(
        c.level,
        d.value === "progressive"
          ? [
              "same",
              "slightly_harder",
              "slightly_harder",
              "harder",
              "advanced",
            ][i]
          : d.value,
      );
      assert.equal(c.optionCount, 4);
    }
});

test("Approval rejects each failed gate, mismatched response count and disagreement even when valid is true", () => {
  const c = similarContract(source, "same", 0);
  for (const key of [
    "valid",
    "sameStructure",
    "difficultyAppropriate",
    "answerMatches",
    "hintsConsistent",
    "selfContained",
    "uniqueAnswer",
  ] as const)
    assert.throws(() =>
      approveSimilarReview(c, source, { ...review(), [key]: false }),
    );
  assert.throws(
    () => approveSimilarReview(c, source, { ...review(), responseCount: 0 }),
    /RESPONSE_COUNT: kỳ vọng 1, nhận 0/,
  );
  assert.throws(
    () => approveSimilarReview(c, source, { ...review(), answer: "B" }),
    /ANSWER_LABEL/,
  );
  assert.throws(
    () =>
      approveSimilarReview(
        { ...c, grading: "exact" },
        { ...source, grading: "exact", answer: "68" },
        { ...review(), answer: "67" },
      ),
    /EXACT_ANSWER/,
  );
});

test("Deterministic checks catch wrong predecessor, missing options/media and unchecked arithmetic subparts", () => {
  assert.doesNotThrow(() => validateSimilarStructure(source, source));
  assert.doesNotThrow(() =>
    validateSimilarStructure(source, {
      ...source,
      prompt: "Số liền sau của một số là 70. Số liền trước của số đó là:",
    }),
  );
  assert.doesNotThrow(() =>
    validateSimilarStructure(source, {
      ...source,
      prompt: "Số liền trước của số liền sau của 69 là:",
    }),
  );
  assert.throws(
    () =>
      validateSimilarStructure(source, {
        ...source,
        prompt: "Số liền sau của 67 là:",
      }),
    /TASK_INVARIANT/,
  );
  assert.throws(
    () => validateSimilarStructure(source, { ...source, answer: "B" }),
    /ANSWER:/,
  );
  assert.throws(
    () =>
      validateSimilarStructure(source, {
        ...source,
        options: source.options.slice(1),
      }),
    /OPTIONS:/,
  );
  assert.throws(
    () => validateSimilarStructure(source, { ...source, hasFigure: true }),
    /MISSING_MEDIA:/,
  );
  const arithmetic = {
    ...source,
    grading: "self_review" as const,
    options: [],
    answerFields: [{ id: "a", label: "26+29" }],
    rubric: [{ id: "a", label: "Kết quả", criteria: "55", maxPoints: 1 }],
  };
  assert.throws(
    () => validateSimilarStructure(arithmetic, arithmetic),
    /CHECK_COVERAGE/,
  );
  assert.doesNotThrow(() =>
    validateSimilarStructure(arithmetic, {
      ...arithmetic,
      checks: [{ expression: "26 + 29", value: 55 }],
    }),
  );
});

test("Content identity ignores IDs but distinguishes real subparts under a generic prompt", () => {
  assert.equal(sameSimilarContent(source, { ...source, id: "other" }), true);
  assert.equal(
    sameSimilarContent(
      {
        ...source,
        prompt: "Tính",
        answerFields: [{ id: "a", label: "26+29" }],
      },
      {
        ...source,
        prompt: "Tính",
        answerFields: [{ id: "b", label: "27+29" }],
      },
    ),
    false,
  );
  assert.equal(
    sameSimilarContent(source, { ...source, passage: "New passage" }),
    false,
  );
});

test("Real build path accepts choice with zero fields at all five settings, and repairs only the failed gate", async () => {
  const originalFetch = globalThis.fetch,
    oldKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-only";
  let draftCalls = 0,
    reviewCalls = 0,
    repair = false;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    const payload = JSON.parse(body.messages[1].content[0].text);
    let result;
    if (body.response_format.json_schema.name === "similar_question") {
      draftCalls++;
      assert.equal(payload.contract.inputFieldCount, 0);
      assert.equal(payload.contract.responseCount, 1);
      if (repair && reviewCalls === 1) {
        assert.match(payload.correction, /CONSISTENCY/);
        assert.equal(
          payload.previousDraft.question.prompt,
          "Số liền trước của 47 là:",
        );
      }
      const { answerFields, contentVersion: _v, ...question } = source;
      result = {
        question: {
          ...question,
          prompt: "Số liền trước của 47 là:",
          options: source.options.map((o, i) => ({
            ...o,
            text: String([46, 47, 48, 45][i]),
          })),
          checks: [{ expression: "47-1", value: 46 }],
          hints: ["Tìm số bé hơn 1.", "Tính 47 - 1.", "47 - 1 = 46."],
          steps: ["Tính 47 - 1.", "Chọn A: 46."],
        },
        answerFields,
      };
    } else {
      reviewCalls++;
      result = {
        ...review(),
        hintsConsistent: !(repair && reviewCalls === 1),
        reason: repair && reviewCalls === 1 ? "Sửa gợi ý." : "Đạt.",
      };
    }
    return Response.json({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(result) } },
      ],
    });
  };
  try {
    for (const d of similarDifficulties) {
      const q = await buildSimilarQuestion(
        source,
        d.value,
        0,
        [],
        "anthropic/claude-haiku-5.5",
      );
      assert.equal(q.answerFields?.length, 0);
      assert.equal(q.generationApproval?.review.responseCount, 1);
    }
    assert.equal(draftCalls, 5);
    assert.equal(reviewCalls, 5);
    draftCalls = reviewCalls = 0;
    repair = true;
    const q = await buildSimilarQuestion(source, "same", 0, [], "test");
    assert.equal(q.generationApproval?.attempts, 2);
    assert.equal(draftCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
});
