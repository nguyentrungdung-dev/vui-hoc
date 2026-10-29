import { test } from "node:test";
import assert from "node:assert/strict";
import { guidanceSamples } from "../../scripts/fixtures/guidance-samples";
import manifest from "../../public/characters/manifest.json";
import {
  storySource,
  validateStory,
  chooseSticker,
  storyAsMotion,
} from "./guidance-story";
import { guidanceSource } from "./guidance";
import { fixtureStory, fixtureWords } from "./test-support/story-fixture";
import { alignMotion } from "./guidance-motion";
import { speechText } from "./guidance-ai";
import { equationDiagram } from "../lib/guidance-diagram";

for (const q of guidanceSamples)
  test(`Universal new flow: ${q.topic}, independent narration, grounded visual and word cues`, () => {
    const input = guidanceSource(q);
    assert.equal(input.motionTemplate, "lesson-v3");
    assert.ok(!JSON.stringify(input).includes(q.hints[0]));
    const source = storySource(q),
      lesson = validateStory(fixtureStory(source), source);
    assert.notDeepEqual(
      lesson.segments.map((s) => s.narration),
      q.steps,
    );
    const clips = lesson.segments.map((_, i) => ({
      start: (i * 50) / 6,
      end: ((i + 1) * 50) / 6,
    }));
    const events = alignMotion(
      storyAsMotion(lesson),
      clips,
      fixtureWords(lesson),
    );
    assert.equal(events.length, lesson.segments.length);
    assert.ok(events.every((e) => e.action.startsWith("item-")));
  });
test("Invented visual facts, missing steps and absent cues are rejected; punctuation repair stays literal", () => {
  const source = storySource(guidanceSamples[0]);
  const broken = fixtureStory(source);
  broken.segments[0].items[0].text = "46 + 38 = 90";
  assert.throws(() => validateStory(broken, source), /trích đúng/);
  const incomplete = fixtureStory(source);
  incomplete.segments[0].coveredSteps = [];
  assert.throws(() => validateStory(incomplete, source), /bao quát/);
  const cue = fixtureStory(source);
  cue.segments[0].items[0].cue = "câu không được đọc";
  assert.throws(() => validateStory(cue, source), /Cue/);
  const punctuation = fixtureStory(source);
  punctuation.segments[0].items[0].cue = "cùng, mình, giải";
  assert.equal(
    validateStory(punctuation, source).segments[0].items[0].cue,
    "Cùng mình giải",
  );
});
test("Character choice is restricted to the existing collection; new figure descriptions invalidate cache source", () => {
  for (let i = 0; i < 20; i++) {
    const sticker = chooseSticker();
    assert.ok(manifest.characters.some((c) => c.src === sticker.src));
  }
  const q = guidanceSamples.find((q) => q.hasFigure)!;
  assert.notEqual(
    guidanceSource(q).sourceHash,
    guidanceSource({
      ...q,
      figureDescription: q.figureDescription + " Hình đã sửa.",
    }).sourceHash,
  );
});
test("Physical object diagrams never count an unverified, oversized or decimal equation", () => {
  for (const [text, total] of [
    ["6 + 8 = 14", 14],
    ["12 - 8 = 4", 12],
    ["3 × 4 = 12", 12],
    ["12 ÷ 3 = 4", 12],
  ] as const)
    assert.equal(equationDiagram(text)?.total, total);
  for (const text of [
    "6 + 8 = 15",
    "46 + 38 = 84",
    "6 + 8 = 14.5",
    "1.6 + 8 = 14",
    "2 ÷ 0 = 1",
  ])
    assert.equal(equationDiagram(text), null);
});

test("Spoken Vietnamese units and English X-ray never become multiplication", () => {
  assert.equal(speechText("sáu xăng-ti-mét"), "sáu xăng-ti-mét");
  assert.equal(speechText("X-ray và chữ X"), "X-ray và chữ X");
  assert.equal(speechText("6 x 4"), "sáu nhân bốn");
  assert.equal(speechText("6x4"), "sáu nhân bốn");
});
