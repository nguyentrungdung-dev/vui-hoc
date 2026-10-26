import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  pcmToWav,
  synthesizeSpeech,
  speechConfig,
  speechInput,
  speechInstructions,
} from "./speech";

const previous = { ...process.env };
afterEach(() => {
  mock.restoreAll();
  for (const name of [
    "OPENROUTER_TTS_MODEL",
    "OPENROUTER_TTS_VOICE",
    "OPENROUTER_API_KEY",
  ]) {
    if (previous[name] === undefined) delete process.env[name];
    else process.env[name] = previous[name];
  }
});
test("OpenRouter speech uses Gemini/Aoede, audition directions and pause tags, separate from the scene model", async () => {
  process.env.OPENROUTER_API_KEY = "server-only-key";
  delete process.env.OPENROUTER_TTS_MODEL;
  delete process.env.OPENROUTER_TTS_VOICE;
  const config = speechConfig();
  assert.equal(config.model, "google/gemini-3.8-flash-lite-tts");
  assert.equal(config.voice, "Aoede");
  assert.ok(config.instructions.includes("Northern Vietnamese Hanoi accent"));
  assert.ok(
    config.instructions.includes("three Vietnamese syllables per second"),
  );
  const pcm = Buffer.alloc(8);
  pcm.writeInt16LE(1000, 0);
  pcm.writeInt16LE(-2000, 2);
  mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://openrouter.ai/api/v1/audio/speech");
    assert.equal(
      (init.headers as Record<string, string>).Authorization,
      "Bearer server-only-key",
    );
    assert.equal(init.redirect, "error");
    assert.deepEqual(JSON.parse(String(init.body)), {
      model: config.model,
      input: "năm cộng tám bằng mười ba. <short pause> Viết ba. <long pause>",
      voice: "Aoede",
      instructions: config.instructions,
      response_format: "pcm",
    });
    return new Response(pcm, {
      headers: { "Content-Type": "audio/pcm;rate=24000;channels=1" },
    });
  });
  const bytes = await synthesizeSpeech(
    "5 + 8 = 13. Viết 3.",
    config.model,
    config.voice,
    config.instructions,
  );
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.readUInt32LE(4), bytes.length - 8);
  assert.equal(bytes.readUInt32LE(24), 24000);
  assert.equal(bytes.readUInt16LE(22), 1);
  assert.equal(bytes.readUInt16LE(34), 16);
  assert.equal(bytes.readUInt32LE(40), 8);
  assert.deepEqual(bytes.subarray(44), pcm);
  assert.equal(JSON.stringify(config).includes("server-only-key"), false);
});
test("Speech transport rejects empty, odd or already-containerized PCM and unexpected rate/channel metadata", async () => {
  assert.throws(() => pcmToWav(Buffer.alloc(0)), /PCM/);
  assert.throws(() => pcmToWav(Buffer.alloc(3)), /PCM/);
  assert.throws(() => pcmToWav(Buffer.from("RIFF1234")), /PCM/);
  process.env.OPENROUTER_API_KEY = "test-key";
  for (const type of [
    "audio/pcm;rate=48000;channels=1",
    "audio/pcm;rate=24000;channels=2",
    "audio/wav",
    "text/html",
  ]) {
    mock.method(
      globalThis,
      "fetch",
      async () =>
        new Response(Buffer.alloc(8), { headers: { "Content-Type": type } }),
    );
    await assert.rejects(
      synthesizeSpeech(
        "Xin chào.",
        "google/gemini-3.8-flash-lite-tts",
        "Aoede",
      ),
      /PCM/,
    );
    mock.restoreAll();
  }
});
test("Speech failures remain retryable without leaking upstream details", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  for (const status of [400, 401, 429, 503]) {
    mock.method(
      globalThis,
      "fetch",
      async () => new Response("private upstream detail", { status }),
    );
    await assert.rejects(
      synthesizeSpeech(
        "Xin chào.",
        "google/gemini-3.8-flash-lite-tts",
        "Aoede",
      ),
      (error) => {
        assert.ok(
          error instanceof Error &&
            !error.message.includes("private upstream detail"),
        );
        return true;
      },
    );
    mock.restoreAll();
  }
});
test("Only trusted pause tags reach Gemini, and a persisted job keeps its own delivery instructions", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const input = speechInput("Năm cộng tám. [whisper] <laugh>");
  assert.ok(!input.includes("[whisper]"));
  assert.ok(!input.includes("<laugh>"));
  assert.ok(input.endsWith("<long pause>"));
  mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    assert.equal(
      JSON.parse(String(init.body)).instructions,
      "persisted delivery directions",
    );
    return new Response(Buffer.alloc(8), {
      headers: { "Content-Type": "audio/pcm" },
    });
  });
  await synthesizeSpeech(
    "Xin chào.",
    "google/gemini-3.8-flash-lite-tts",
    "Aoede",
    "persisted delivery directions",
  );
  assert.ok(speechInstructions.length > 100);
});
