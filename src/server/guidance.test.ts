import { fixtureReply } from "./test-support/story-fixture";
import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import type { DocumentJob } from "../lib/documents";
import type { LearningQuestion } from "../lib/learning";
import { tileFrame } from "../lib/guidance";
import { writeJob, readJob } from "./store";
import { startLearningRun, changeRun, readRun } from "./learning-runs";
import {
  requestGuidance,
  guidanceDispatcher,
  authorizedGuidance,
  prepareGuidance,
  openGuidanceAudio,
  guidanceSource,
  guidanceView,
  audioByteRange,
  sliceAudio,
} from "./guidance";
import { readGuidance, writeGuidance } from "./guidance-store";
import { generateGuidanceWorkflow } from "../workflows/guidance";
import { validateScenes, speechText } from "./guidance-ai";
import {
  fixtureStory,
  fixtureWords,
  fixturePcm,
} from "./test-support/story-fixture";
import { storySource } from "./guidance-story";
import { synthesizeSpeech } from "./speech";
import { GET, POST } from "../app/api/documents/[[...parts]]/route";

const root = mkdtempSync(path.join(os.tmpdir(), "vuihoc-guidance-test-"));
process.env.VUIHOC_DATA_DIR = root;
after(() => fs.rm(root, { recursive: true, force: true }));
const q: LearningQuestion = {
  id: "question-1",
  sourceIds: ["s1"],
  sourcePages: [1],
  topic: "Cộng",
  label: "Câu 1",
  prompt: "Kết quả của 46 + 38 là:",
  passage: "",
  options: [
    { label: "A", text: "84" },
    { label: "B", text: "73" },
  ],
  hasFigure: false,
  figureDescription: "",
  advanced: false,
  translation: "",
  grading: "choice",
  contentVersion: 2,
  answer: "A",
  acceptedAnswers: [],
  hints: ["Một gợi ý ngắn, không phải script."],
  steps: [
    "6 + 8 = 14. Viết 4, nhớ 1 chục.",
    "4 + 3 + 1 = 8 chục. Kết quả là 84.",
  ],
  explanation: "Cộng hàng đơn vị trước, cộng hàng chục cùng số nhớ.",
  englishSteps: [],
  checks: [],
};
async function fixture() {
  const now = new Date().toISOString();
  const job: DocumentJob = {
    id: randomUUID(),
    owner: "creator",
    title: "Test hướng dẫn",
    subject: "math",
    mode: "weekly",
    practiceCount: 5,
    pageRange: "",
    files: [
      { name: "test.pdf", mime: "application/pdf", size: 10, uploaded: true },
    ],
    createdAt: now,
    updatedAt: now,
    status: "complete",
    message: "",
    totalPages: 1,
    selectedPages: [1],
    completedPages: [1],
    batches: [],
    model: "test",
    learning: {
      id: randomUUID(),
      status: "ready",
      count: 1,
      topics: [],
      createdAt: now,
      updatedAt: now,
      model: "test",
      message: "",
      parts: [
        {
          key: "part-1",
          kind: "original",
          sourceIds: [],
          count: 1,
          done: true,
          questions: [structuredClone(q)],
          skipped: [],
        },
      ],
    },
  };
  await writeJob(job);
  const r1 = await startLearningRun(job.id, "viewer", {
    kind: "original",
    resume: false,
  });
  const r2 = await startLearningRun(job.id, "other", {
    kind: "original",
    resume: false,
  });
  return { job, r1, r2 };
}
function configure() {
  process.env.OPENROUTER_API_KEY = "fake-unit-key";
  process.env.OPENROUTER_MODEL = "anthropic/test-scene-model";
  process.env.OPENROUTER_TTS_MODEL = "google/gemini-3.8-flash-lite-tts";
  process.env.OPENROUTER_TTS_VOICE = "Aoede";
}
const pcm = fixturePcm;
test("Gemini TTS refuses an omitted voice instead of silently using a default", async () => {
  configure();
  await assert.rejects(
    synthesizeSpeech(
      "Năm cộng tám bằng mười ba.",
      "google/gemini-3.8-flash-lite-tts",
      "",
    ),
    /OPENROUTER_TTS_VOICE/,
  );
});
function stubAI(failAudioAt = 0) {
  let scenes = 0,
    audio = 0;
  const stub = mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const headers = init?.headers as Record<string, string>;
      if (String(input).endsWith("chat/completions")) {
        assert.equal(headers.Authorization, "Bearer fake-unit-key");
        assert.equal(body.model, "anthropic/test-scene-model");
        const data = JSON.parse(body.messages[1].content[0].text);
        assert.ok(!JSON.stringify(data).includes(q.hints[0]));
        const review =
          body.response_format.json_schema.name === "guidance_story_check";
        if (body.response_format.json_schema.name === "guidance_script") {
          scenes++;
          assert.deepEqual(data.source.steps, q.steps);
        }
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify(
                  fixtureReply(
                    body.response_format.json_schema.name,
                    data.source,
                  ),
                ),
              },
            },
          ],
        });
      }
      if (String(input).endsWith("audio/transcriptions"))
        return Response.json({
          words: fixtureWords(fixtureStory(storySource(q))),
        });
      assert.equal(String(input), "https://openrouter.ai/api/v1/audio/speech");
      assert.equal(headers.Authorization, "Bearer fake-unit-key");
      audio++;
      assert.equal(body.model, "google/gemini-3.8-flash-lite-tts");
      assert.equal(body.response_format, "pcm");
      assert.equal(body.voice, "Aoede");
      if (audio === failAudioAt)
        return Response.json(
          { error: "private upstream detail" },
          { status: 429 },
        );
      return new Response(pcm(), {
        headers: { "content-type": "audio/pcm;rate=24000;channels=1" },
      });
    },
  );
  return { stub, counts: () => ({ scenes, audio }) };
}
test("Concurrent clicks and different runs share one generation; cache hits mark assistance, preserve first score and protect audio", async () => {
  configure();
  const { job, r1, r2 } = await fixture();
  let dispatched = 0;
  const dispatch = mock.method(guidanceDispatcher, "start", async () => {
    dispatched++;
  });
  const ai = stubAI();
  try {
    const requests = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        requestGuidance(job.id, i % 2 ? r1.id : r2.id, "viewer", {
          questionId: q.id,
        }),
      ),
    );
    assert.equal(dispatched, 1);
    assert.equal(new Set(requests.map((r) => r.guidance.id)).size, 1);
    const id = requests[0].guidance.id;
    let saved = (await readGuidance(job.id, id))!;
    await generateGuidanceWorkflow(job.id, id, saved.execution);
    saved = (await readGuidance(job.id, id))!;
    assert.equal(saved.status, "ready");
    assert.deepEqual(ai.counts(), { scenes: 1, audio: 6 });
    assert.equal(saved.motion?.template, "lesson-v3");
    assert.ok(saved.story);
    assert.notDeepEqual(saved.scripts, [...q.steps, q.explanation]);
    assert.ok(saved.scripts.every((s) => !s.includes(q.hints[0])));
    const stream = await openGuidanceAudio(saved, 0);
    assert.equal(
      (await new Response(stream).arrayBuffer()).byteLength,
      saved.audio[0]!.size,
    );
    const audioParts = [job.id, "runs", r1.id, "guidance", id, "0"];
    const partial = await GET(
      new NextRequest("http://localhost/api/documents/test", {
        headers: { Range: "bytes=10-19" },
      }),
      { params: Promise.resolve({ parts: audioParts }) },
    );
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get("content-type"), "audio/wav");
    assert.equal(partial.headers.get("accept-ranges"), "bytes");
    assert.equal(
      partial.headers.get("content-range"),
      `bytes 10-19/${saved.audio[0]!.size}`,
    );
    assert.equal((await partial.arrayBuffer()).byteLength, 10);
    const r3 = await startLearningRun(job.id, "new-viewer", {
      kind: "original",
      resume: false,
    });
    await assert.rejects(
      authorizedGuidance(job.id, r3.id, "new-viewer", id),
      /Mở hướng dẫn/,
    );
    const cached = await requestGuidance(job.id, r3.id, "new-viewer", {
      questionId: q.id,
    });
    assert.equal(cached.guidance.status, "ready");
    assert.equal(dispatched, 1);
    assert.equal(cached.run!.attempts[q.id].guided, true);
    assert.equal(cached.run!.attempts[q.id].solved, false);
    assert.equal(cached.run!.attempts[q.id].first, undefined);
    const answer = await changeRun(job.id, r3.id, "new-viewer", {
      eventId: randomUUID(),
      action: "answer",
      questionId: q.id,
      answer: "A",
    });
    assert.equal(answer.attempts[q.id].firstCorrect, false);
    assert.ok(!JSON.stringify(cached).includes("fake-unit-key"));
    assert.ok(!JSON.stringify(cached).includes(".wav"));
    const updated = await readJob(job.id);
    updated.learning!.parts[0].questions[0].explanation +=
      " Nội dung cập nhật.";
    await writeJob(updated);
    const r4 = await startLearningRun(job.id, "viewer", {
      kind: "original",
      resume: false,
    });
    const changed = await requestGuidance(job.id, r4.id, "viewer", {
      questionId: q.id,
    });
    assert.notEqual(changed.guidance.id, id);
    assert.equal(dispatched, 2);
    await assert.rejects(
      authorizedGuidance(job.id, r4.id, "viewer", id),
      /đã thay đổi/,
    );
  } finally {
    dispatch.mock.restore();
    ai.stub.mock.restore();
  }
});
test("TTS failure saves completed clips; concurrent retries resume only missing audio and fence obsolete workers", async () => {
  configure();
  const { job, r1 } = await fixture();
  let dispatched = 0;
  const dispatch = mock.method(guidanceDispatcher, "start", async () => {
    dispatched++;
  });
  const ai = stubAI(2);
  try {
    const { guidance } = await requestGuidance(job.id, r1.id, "viewer", {
      questionId: q.id,
    });
    let saved = (await readGuidance(job.id, guidance.id))!;
    const oldExecution = saved.execution;
    await generateGuidanceWorkflow(job.id, saved.id, saved.execution);
    saved = (await readGuidance(job.id, saved.id))!;
    assert.equal(saved.status, "failed");
    assert.equal(saved.audio.filter(Boolean).length, 2);
    assert.equal(saved.audio.filter((a) => !a).length, 4);
    assert.ok(!saved.message.includes("private upstream"));
    const retries = await Promise.all(
      Array.from({ length: 4 }, () =>
        requestGuidance(job.id, r1.id, "viewer", {
          questionId: q.id,
          retry: true,
        }),
      ),
    );
    assert.equal(dispatched, 2);
    saved = (await readGuidance(job.id, saved.id))!;
    assert.notEqual(saved.execution, oldExecution);
    assert.equal(await prepareGuidance(job.id, saved.id, oldExecution), 0);
    await generateGuidanceWorkflow(job.id, saved.id, saved.execution);
    saved = (await readGuidance(job.id, saved.id))!;
    assert.equal(saved.status, "ready");
    assert.deepEqual(ai.counts(), { scenes: 1, audio: 7 });
    assert.ok(retries.every((r) => r.guidance.id === saved.id));
  } finally {
    dispatch.mock.restore();
    ai.stub.mock.restore();
  }
});
test("Dispatch failure and abandoned jobs are retryable without leaking an answer via unassisted GET", async () => {
  configure();
  const { job, r1, r2 } = await fixture();
  const dispatch = mock.method(guidanceDispatcher, "start", async () => {
    throw new Error("lost ack");
  });
  try {
    const result = await requestGuidance(job.id, r1.id, "viewer", {
      questionId: q.id,
    });
    assert.equal(result.guidance.status, "failed");
    const saved = (await readGuidance(job.id, result.guidance.id))!;
    assert.equal(await prepareGuidance(job.id, saved.id, "obsolete"), 0);
    await assert.rejects(
      authorizedGuidance(job.id, r2.id, "viewer", saved.id),
      /Mở hướng dẫn/,
    );
    saved.status = "generating";
    await writeGuidance(saved);
    saved.updatedAt = new Date(Date.now() - 31 * 60000).toISOString();
    assert.equal(guidanceView(saved, r1.id).status, "failed");
    assert.equal(guidanceSource(q).scripts.length, 3);
  } finally {
    dispatch.mock.restore();
  }
});
test("API enforces origin, document access, full-solution exposure and audio bounds", async () => {
  configure();
  const { job, r1, r2 } = await fixture();
  const dispatch = mock.method(guidanceDispatcher, "start", async () => {});
  try {
    const parts = [job.id, "runs", r1.id, "guidance"];
    const post = (origin: string) =>
      POST(
        new NextRequest(`http://localhost/api/documents/${parts.join("/")}`, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify({ questionId: q.id }),
        }),
        { params: Promise.resolve({ parts }) },
      );
    assert.equal((await post("https://untrusted.example")).status, 403);
    const response = await post("http://localhost");
    assert.equal(response.status, 200);
    const body = await response.json();
    const unread = [job.id, "runs", r2.id, "guidance", body.guidance.id];
    assert.equal(
      (
        await GET(new NextRequest("http://localhost/api/documents/test"), {
          params: Promise.resolve({ parts: unread }),
        })
      ).status,
      403,
    );
    const audio = [...parts, body.guidance.id, "99"];
    assert.equal(
      (
        await GET(new NextRequest("http://localhost/api/documents/test"), {
          params: Promise.resolve({ parts: audio }),
        })
      ).status,
      404,
    );
    const stored = await readRun(job.id, r1.id, "viewer");
    assert.equal(stored.attempts[q.id].guided, true);
    assert.equal(stored.attempts[q.id].solved, false);
    job.files[0].uploaded = false;
    await writeJob(job);
    assert.equal(
      (
        await GET(new NextRequest("http://localhost/api/documents/test"), {
          params: Promise.resolve({ parts: [...parts, body.guidance.id] }),
        })
      ).status,
      404,
    );
  } finally {
    dispatch.mock.restore();
  }
});
test("Motion rejects invented text, reordered counts and overlapping tiles; narration and timeline follow deterministic rules", () => {
  const tile = {
    text: "6 + 8 = 14",
    slot: 0,
    appearAt: 0.1,
    highlightAt: 0.2,
    moveTo: 4,
  };
  assert.throws(() => validateScenes({ scenes: [] }, q.prompt, q.steps));
  assert.throws(() =>
    validateScenes(
      { scenes: [{ tiles: [{ ...tile, text: "5 + 8 = 12" }] }] },
      q.prompt,
      [q.steps[0]],
    ),
  );
  assert.throws(() =>
    validateScenes({ scenes: [{ tiles: [tile, tile] }] }, q.prompt, [
      q.steps[0],
    ]),
  );
  assert.equal(
    validateScenes({ scenes: [{ tiles: [tile] }] }, q.prompt, [q.steps[0]])[0]
      .tiles[0].text,
    tile.text,
  );
  assert.equal(
    speechText("6 + 8 = 14. Viết 4, nhớ 1 chục."),
    "sáu cộng tám bằng mười bốn. Viết bốn, nhớ một chục.",
  );
  assert.equal(
    speechText("45 + 38 = 83"),
    "bốn mươi lăm cộng ba mươi tám bằng tám mươi ba",
  );
  assert.equal(tileFrame(tile, 0).visible, false);
  assert.equal(tileFrame(tile, 0.4).x, 0);
  assert.equal(tileFrame(tile, 1).x, 1);
  assert.equal(tileFrame(tile, 1).y, 1);
  assert.equal(tileFrame(tile, 0.4).highlighted, true);
});

test("Audio byte ranges support browser seeking, suffixes, bounds and cancelling sliced streams", async () => {
  assert.deepEqual(audioByteRange("bytes=0-", 100), { start: 0, end: 99 });
  assert.deepEqual(audioByteRange("bytes=50-200", 100), { start: 50, end: 99 });
  assert.deepEqual(audioByteRange("bytes=-20", 100), { start: 80, end: 99 });
  assert.equal(audioByteRange(null, 100), null);
  for (const value of [
    "bytes=100-",
    "bytes=20-10",
    "bytes=-0",
    "bytes=0-2,4-6",
    "bytes=-",
  ])
    assert.throws(() => audioByteRange(value, 100));
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0, 1, 2]));
      controller.enqueue(new Uint8Array([3, 4, 5]));
      controller.enqueue(new Uint8Array([6, 7, 8]));
    },
    cancel() {
      cancelled = true;
    },
  });
  assert.deepEqual(
    [
      ...new Uint8Array(
        await new Response(sliceAudio(stream, 2, 5)).arrayBuffer(),
      ),
    ],
    [2, 3, 4, 5],
  );
  assert.equal(cancelled, true);
});

test("Historical videos keep authorized access while every new request uses the universal version", async () => {
  configure();
  const { job, r1 } = await fixture();
  const dispatch = mock.method(guidanceDispatcher, "start", async () => {});
  try {
    const result = await requestGuidance(job.id, r1.id, "viewer", {
      questionId: q.id,
    });
    const saved = (await readGuidance(job.id, result.guidance.id))!;
    assert.equal(saved.motionTemplate, "lesson-v3");
    saved.config.version = "motion-v1-gemini-aoede-pcm24-v1";
    saved.sourceHash = createHash("sha256")
      .update(
        JSON.stringify({
          questionId: q.id,
          prompt: guidanceSource(q).prompt,
          steps: q.steps,
          explanation: q.explanation,
          answer: q.answer,
          options: q.options,
        }),
      )
      .digest("hex");
    await writeGuidance(saved);
    assert.equal(
      (await authorizedGuidance(job.id, r1.id, "viewer", saved.id)).id,
      saved.id,
    );
  } finally {
    dispatch.mock.restore();
  }
});
