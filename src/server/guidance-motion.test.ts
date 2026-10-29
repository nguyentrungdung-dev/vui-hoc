import { randomUUID } from "node:crypto";
import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import approved from "./guidance-motion/approved-45-38.json";
import {
  supportsCarryMotion,
  alignMotion,
  assembleLesson,
} from "./guidance-motion";
import { pcmToWav } from "./speech";
import {
  prepareGuidance,
  createGuidanceAudio,
  finishGuidance,
  guidanceView,
  failGuidance,
} from "./guidance";
import {
  writeGuidance,
  readGuidance,
  type GuidanceJob,
} from "./guidance-store";
import type { LearningQuestion } from "../lib/learning";

const root = mkdtempSync(path.join(os.tmpdir(), "vuihoc-motion-test-"));
process.env.VUIHOC_DATA_DIR = root;
after(() => fs.rm(root, { recursive: true, force: true }));
const clips = approved.segments.map((s, i) => ({
  start: (i * 50) / 6,
  end: ((i + 1) * 50) / 6,
  seconds: 50 / 6,
  narration: s.narration,
}));
const words = approved.segments.flatMap((s, i) =>
  s.narration.split(/\s+/).map((word, j, a) => ({
    word,
    start: clips[i].start + (j * 7.5) / a.length,
    end: clips[i].start + ((j + 1) * 7.5) / a.length,
  })),
);

test("Only the vetted simple addition and correct source answer select the pilot renderer", () => {
  const q = {
    prompt: "Tính 45 + 38",
    passage: "",
    hasFigure: false,
    grading: "choice",
    answer: "A",
    options: [{ label: "A", text: "83" }],
    steps: ["5 + 8 = 13; 4 + 3 + 1 = 8"],
  } as LearningQuestion;
  assert.equal(supportsCarryMotion(q), true);
  for (const changed of [
    { prompt: "45 + 38 - 2" },
    { prompt: "Hộp có 45 bi, thêm 38 bi và 2 bi" },
    { answer: "B" },
    { hasFigure: true },
    { passage: "Một câu chuyện khác" },
    { prompt: "46 + 37" },
    { steps: ["Lời giải chưa kiểm tra"] },
  ])
    assert.ok(!supportsCarryMotion({ ...q, ...changed }));
});
test("Word cues survive normalization and seeking has no estimated timestamps; invalid speech is rejected", () => {
  const events = alignMotion(approved, clips, words);
  assert.equal(events.length, 17);
  assert.equal(events[0].action, "show_problem");
  assert.ok(events.every((e, i) => !i || e.time >= events[i - 1].time));
  assert.throws(() => alignMotion(approved, clips, []), /mốc lời đọc/);
  assert.throws(
    () => alignMotion(approved, clips, [{ word: "sai", start: 0, end: 1 }]),
    /khớp kịch bản/,
  );
});
test("Integrated narration, six audio clips, processing, alignment retry and safe ready projection", async () => {
  process.env.OPENROUTER_API_KEY = "fake-motion-key";
  const job: GuidanceJob = {
    id: "b".repeat(64),
    documentId: randomUUID(),
    questionId: "q",
    sourceHash: "source",
    prompt: "45 + 38",
    scripts: ["5 + 8 = 13; 4 + 3 + 1 = 8"],
    motionTemplate: "carry-45-38",
    config: {
      model: "anthropic/claude-haiku-5.5",
      ttsModel: "google/gemini-3.8-flash-lite-tts",
      voice: "Aoede",
      version: "test",
    },
    status: "queued",
    message: "",
    execution: "execution-1",
    scenes: null,
    audio: [null],
    updatedAt: new Date().toISOString(),
  };
  await writeGuidance(job);
  let tts = 0,
    asr = 0;
  // Continuous voiced samples exercise real WAV processing without a paid API.
  const pcm = Buffer.alloc(7.5 * 48000);
  for (let i = 0; i < pcm.length; i += 2)
    pcm.writeInt16LE(i % 4 ? 1200 : -1200, i);
  const stub = mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (String(input).endsWith("chat/completions")) {
        assert.deepEqual(body.reasoning, { enabled: false });
        assert.equal(body.max_tokens, 1800);
        assert.ok(!JSON.stringify(body.messages).includes("fake-motion-key"));
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify(
                  Object.fromEntries(
                    approved.segments.map((s) => [s.id, s.narration]),
                  ),
                ),
              },
            },
          ],
        });
      }
      if (String(input).endsWith("audio/speech")) {
        tts++;
        assert.equal(body.voice, "Aoede");
        return new Response(pcm, { headers: { "content-type": "audio/pcm" } });
      }
      asr++;
      assert.deepEqual(body.timestamp_granularities, ["word"]);
      return Response.json({ words: asr <= 2 ? [] : words });
    },
  );
  try {
    assert.equal(
      await prepareGuidance(job.documentId, job.id, job.execution),
      6,
    );
    for (let i = 0; i < 6; i++)
      assert.equal(
        await createGuidanceAudio(job.documentId, job.id, i, job.execution),
        true,
      );
    await assert.rejects(
      finishGuidance(job.documentId, job.id, job.execution),
      /mốc từng từ/,
    );
    let saved = (await readGuidance(job.documentId, job.id))!;
    assert.ok(saved.motionPrepared);
    assert.equal(saved.status, "generating");
    await failGuidance(job.documentId, job.id, job.execution);
    saved = (await readGuidance(job.documentId, job.id))!;
    saved.status = "queued";
    await writeGuidance(saved);
    await finishGuidance(saved.documentId, saved.id, saved.execution);
    saved = (await readGuidance(saved.documentId, saved.id))!;
    assert.equal(saved.status, "ready");
    assert.equal(tts, 6);
    assert.equal(asr, 3);
    assert.ok(Math.abs(saved.motion!.duration - 50) < 0.001);
    assert.equal(saved.motion!.events.length, 17);
    const view = guidanceView(saved, "run");
    assert.equal(view.segments.length, 6);
    assert.ok(!JSON.stringify(view).includes(".wav"));
    assert.ok(!JSON.stringify(view).includes("fake-motion-key"));
  } finally {
    stub.mock.restore();
  }
});
test("Audio rejects long narration instead of accelerating it", () => {
  const pcm = Buffer.alloc(56 * 48000);
  for (let i = 0; i < pcm.length; i += 2) pcm.writeInt16LE(1000, i);
  assert.throws(() => assembleLesson([pcmToWav(pcm)]), /too long/);
});

test("ASR numeric tens and hallucinated outros do not become narration or substitute missing cue anchors", () => {
  const normalized = approved.segments.flatMap((s, i) => {
    const text =
      i === 4
        ? "40 cộng 30 cộng một chục nhớ bằng 80 nên mình viết số tám"
        : s.narration;
    return text.split(/\s+/).map((word, j, a) => ({
      word,
      start: clips[i].start + (j * 7.5) / a.length,
      end: clips[i].start + ((j + 1) * 7.5) / a.length,
    }));
  });
  normalized.push({ word: "Subscribe kênh", start: 24, end: 24.5 });
  assert.equal(alignMotion(approved, clips, normalized).length, 17);
  assert.throws(
    () =>
      alignMotion(
        approved,
        clips,
        normalized.map((w) => (w.word === "gom" ? { ...w, word: "sai" } : w)),
      ),
    /căn được chuyển động/,
  );
});
