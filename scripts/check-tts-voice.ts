/** Manual, explicit live check of a voice using the configured OpenRouter Gemini TTS model.
 * Usage: node --import tsx scripts/check-tts-voice.ts <voice-id> <output-dir>
 * Does not change the application database or generate Claude scenes.
 */
import { loadEnvConfig } from "@next/env";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  synthesizeSpeech,
  speechConfig,
  speechInput,
} from "../src/server/speech";

async function main() {
  loadEnvConfig(process.cwd());
  const config = speechConfig();
  const voice = process.argv[2] || config.voice;
  const outputDir = process.argv[3];
  const model = config.model;
  if (!voice || !model || !outputDir)
    throw new Error("Cần voice ID, OPENROUTER_TTS_MODEL và thư mục kết quả.");
  await fs.mkdir(outputDir, { recursive: true });
  const scripts = [
    "Bước 1: Cộng hàng đơn vị: 5 + 8 = 13. Viết 3, nhớ 1 chục.",
    "Bước 2: Cộng hàng chục: 4 + 3 + 1 (số nhớ) = 8 chục. Kết quả là 83, chọn C.",
    "Vì 5 đơn vị cộng 8 đơn vị được 13 đơn vị, tức là 1 chục và 3 đơn vị, nên phải nhớ 1 chục. Hàng chục là 4 + 3 + 1 = 8 chục, do đó kết quả là 83.",
  ];
  const results: {
    path: string;
    bytes: number;
    script: string;
    input: string;
    generationId: string | null;
  }[] = [];
  // Record only public routing metadata, never Authorization or the API key.
  const originalFetch = globalThis.fetch;
  let generationId: string | null = null;
  globalThis.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    generationId = response.headers.get("x-generation-id");
    return response;
  };
  // --first tests provider acceptance before committing a chosen voice to env.
  const selected = process.argv.includes("--first")
    ? scripts.slice(0, 1)
    : scripts;
  for (const [index, script] of selected.entries()) {
    const file = path.join(outputDir, `step-${index + 1}.wav`);
    const audio = await synthesizeSpeech(script, model, voice);
    await fs.writeFile(file, audio);
    results.push({
      path: file,
      bytes: audio.length,
      script,
      input: speechInput(script),
      generationId,
    });
    console.log(
      JSON.stringify({ voice, model, path: file, bytes: audio.length }),
    );
  }
  await fs.writeFile(
    path.join(outputDir, "voice-check.json"),
    JSON.stringify(
      { voice, model, instructions: config.instructions, results },
      null,
      2,
    ),
  );
  globalThis.fetch = originalFetch;
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
