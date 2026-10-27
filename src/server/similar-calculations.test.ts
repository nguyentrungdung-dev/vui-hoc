import { test } from "node:test";
import assert from "node:assert/strict";
import type { LearningQuestion } from "../lib/learning";
import {
  calculationBand,
  validateCalculationBand,
} from "./similar-calculations";
const source = {
  prompt: "Đặt tính rồi tính",
  answerFields: [
    { id: "a", label: "26 + 29" },
    { id: "b", label: "45 + 38" },
    { id: "c", label: "41 - 27" },
    { id: "d", label: "60 - 16" },
  ],
} as LearningQuestion;
const question = (labels: string[]) => ({
  ...source,
  answerFields: labels.map((label, i) => ({ id: String(i), label })),
});
test("Progressive calculation bands increase actual work and reject merely renamed easy questions", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((i) => calculationBand(source, "progressive", i)),
    ["current", "cross100", "three_small", "three", "chain"],
  );
  const sets = [
    ["37+46", "52+39", "73-18", "80-35"],
    ["68+57", "76+49", "134-67", "150-76"],
    ["167+148", "236+157", "324-157", "410-156"],
    ["367+258", "478+359", "713-258", "600-257"],
    ["167+248+359", "278+359+146", "913-258-167", "900-257-168"],
  ];
  sets.forEach((labels, i) =>
    assert.doesNotThrow(() =>
      validateCalculationBand(source, question(labels), "progressive", i),
    ),
  );
  for (let i = 1; i < 5; i++)
    assert.throws(() =>
      validateCalculationBand(source, question(sets[0]), "progressive", i),
    );
  assert.throws(() =>
    validateCalculationBand(
      source,
      question(["123-456", "236+157", "324-157", "410-156"]),
      "progressive",
      2,
    ),
  );
});
test("Word problems and other source structures keep their own difficulty review", () => {
  const written = {
    ...source,
    prompt: "Lan có 24 quyển vở...",
    answerFields: [{ id: "answer", label: "Bài giải" }],
  };
  assert.equal(calculationBand(written, "advanced", 4), null);
});
