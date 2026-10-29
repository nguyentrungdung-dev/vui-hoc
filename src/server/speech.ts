import { AppError } from "./validation";
import { speechText } from "./guidance-ai";

export const speechInputVersion = "vi-math-unicode-v2";

// Identical delivery directions to the Aoede audition selected by the user.
export const speechInstructions =
  "Speak entirely in natural native Vietnamese, using a Northern Vietnamese Hanoi accent. You are a warm, patient female primary-school teacher explaining mathematics to a seven-year-old second-grade student. Speak slowly and clearly at about three Vietnamese syllables per second. Articulate every number distinctly, with gentle natural sentence intonation. Pause briefly after each sentence and for about one second between solution steps. Be encouraging and calm, without exaggerated acting, whispering, singing or background music. Read only the supplied transcript; do not read the directions or say the pause tags.";
export function speechConfig() {
  return {
    model:
      process.env.OPENROUTER_TTS_MODEL?.trim() ||
      "google/gemini-3.8-flash-lite-tts",
    voice: process.env.OPENROUTER_TTS_VOICE?.trim() || "Aoede",
    instructions: speechInstructions,
  };
}
export function speechInput(text: string) {
  // Insert only our own Gemini pause tags, after source normalization.
  return (
    speechText(text).replace(/([.!?])\s+(?=\S)/g, "$1 <short pause> ") +
    " <long pause>"
  );
}

/** OpenRouter Gemini returns headerless 24 kHz mono signed 16-bit LE PCM.
 * A finite WAV container lets the existing player determine duration and seek. */
export function pcmToWav(pcm: Buffer) {
  if (!pcm.length || pcm.length % 2 || pcm.subarray(0, 4).toString() === "RIFF")
    throw new AppError("Dịch vụ chưa trả âm thanh PCM hợp lệ.", 502);
  const result = Buffer.alloc(44 + pcm.length);
  result.write("RIFF");
  result.writeUInt32LE(result.length - 8, 4);
  result.write("WAVEfmt ", 8);
  result.writeUInt32LE(16, 16);
  result.writeUInt16LE(1, 20);
  result.writeUInt16LE(1, 22);
  result.writeUInt32LE(24000, 24);
  result.writeUInt32LE(48000, 28);
  result.writeUInt16LE(2, 32);
  result.writeUInt16LE(16, 34);
  result.write("data", 36);
  result.writeUInt32LE(pcm.length, 40);
  pcm.copy(result, 44);
  return result;
}

export async function synthesizeSpeech(
  text: string,
  model: string,
  voice: string,
  instructions = speechInstructions,
) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new AppError("Chưa cấu hình OpenRouter cho giọng đọc.", 503);
  if (!voice.trim())
    throw new AppError("Cần cấu hình OPENROUTER_TTS_VOICE cho giọng đọc.", 503);
  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Title": "Vui Hoc Guidance",
      },
      body: JSON.stringify({
        model,
        input: speechInput(text),
        voice,
        instructions,
        response_format: "pcm",
      }),
      signal: AbortSignal.timeout(150000),
    });
  } catch {
    throw new AppError(
      "Chưa kết nối được dịch vụ giọng đọc OpenRouter. Em hãy thử lại.",
      502,
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError(
      response.status === 429
        ? "Giọng đọc đang bận. Em hãy thử lại sau."
        : [400, 401, 403].includes(response.status)
          ? "Cần kiểm tra model, giọng đọc hoặc khóa API OpenRouter."
          : `Chưa tạo được giọng đọc (HTTP ${response.status}). Em hãy thử lại.`,
      502,
    );
  }
  const type = response.headers.get("content-type") || "";
  const rate = type.match(/;\s*rate=(\d+)/i)?.[1];
  const channels = type.match(/;\s*channels=(\d+)/i)?.[1];
  if (
    !/^audio\/pcm(?:;|$)/i.test(type) ||
    (rate && rate !== "24000") ||
    (channels && channels !== "1") ||
    !response.body
  ) {
    await response.body?.cancel();
    throw new AppError("Dịch vụ chưa trả đúng âm thanh PCM 24 kHz mono.", 502);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 32 * 1024 * 1024)
        throw new AppError("Đoạn giọng đọc vượt dung lượng cho phép.", 502);
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return pcmToWav(Buffer.concat(chunks));
}
