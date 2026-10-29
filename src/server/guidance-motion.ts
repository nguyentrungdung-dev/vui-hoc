import { z } from "zod";
import type { LearningQuestion } from "../lib/learning";
import type { MotionLesson, MotionEvent } from "../lib/guidance";
import approved from "./guidance-motion/approved-45-38.json";
import { compactPlan } from "./guidance-motion/compact-plan.mjs";
import { assembleLesson } from "./guidance-motion/audio-postprocess.mjs";
import { teachingAI } from "./teaching-ai";
import { speechText } from "./guidance-ai";
import { AppError } from "./validation";

export { assembleLesson };
export const motionVersion = "carry-45-38-v2-50s-pcm-quiet-v2-word-v1";
const ids = [
  "intro",
  "units",
  "regroup",
  "carry",
  "tens",
  "conclusion",
] as const;
const schema = z.object({
  intro: z.string().min(1).max(180),
  units: z.string().min(1).max(200),
  regroup: z.string().min(1).max(200),
  carry: z.string().min(1).max(220),
  tens: z.string().min(1).max(220),
  conclusion: z.string().min(1).max(140),
});

// Deliberately match the approved pilot only. Never infer a visual template from
// the answer alone, or apply it to a word problem with additional quantities.
export function supportsCarryMotion(q: LearningQuestion) {
  const answer =
    q.grading === "choice"
      ? q.options.find((o) => o.label === q.answer)?.text
      : q.answer;
  const numbers = q.prompt.match(/\d+/g);
  return (
    !q.hasFigure &&
    !q.passage.trim() &&
    answer?.trim() === "83" &&
    numbers?.join(",") === "45,38" &&
    /\b45\s*\+\s*38\b/.test(q.prompt) &&
    !/[−×÷=*/]/.test(q.prompt) &&
    /5\s*\+\s*8\s*=\s*13/.test(q.steps.join(" ")) &&
    /4\s*\+\s*3\s*\+\s*1/.test(q.steps.join(" "))
  );
}

export async function createCarryLesson(
  prompt: string,
  source: string[],
  model: string,
): Promise<MotionLesson> {
  const reference = Object.fromEntries(
    approved.segments.map((s) => [s.id, s.narration]),
  );
  const result = await teachingAI(
    schema,
    "guidance_narration",
    `Viết lời dẫn video toán lớp hai bằng tiếng Việt, gần gũi như cô giáo nói với em. Tổng 85–105 tiếng phân cách bằng khoảng trắng, mục tiêu khoảng 50 giây. Không đọc lại gợi ý. Không thêm dữ kiện hoặc cách giải. Chỉ chỉnh lời dẫn mẫu nhẹ nhàng, giữ nguyên mọi cụm từ chỉ thao tác để đồng bộ hình. Không thêm lời chào, khen dài, câu hỏi chờ hoặc lặp ý. Viết số bằng chữ. Sáu phần theo mẫu, mỗi phần một câu. Mẫu đã duyệt: ${JSON.stringify(reference)}`,
    [{ type: "text", text: JSON.stringify({ prompt, solution: source }) }],
    undefined,
    model,
  );
  try {
    // Compile only phrases supported by the vetted renderer. No model HTML/JS.
    const plan = compactPlan(result).plan as MotionLesson;
    // A new numerical assertion requires review rather than silently changing
    // the approved math. Phrase/cue ordering is checked by compactPlan too.
    const numericWords = new Set(
      "không một hai ba bốn năm sáu bảy tám chín mười mươi lăm mốt trăm nghìn triệu".split(
        " ",
      ),
    );
    for (let i = 0; i < ids.length; i++) {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFC")
          .replace(/[^\p{L}\s]/gu, " ")
          .split(/\s+/)
          .filter((word) => numericWords.has(word))
          .join(" ");
      if (
        normalize(plan.segments[i].narration) !== normalize(reference[ids[i]])
      )
        throw new Error("Changed mathematical quantities");
    }
    return plan;
  } catch {
    // The approved editorial script is a safe, explicit fallback for this exact
    // source template; don't spend extra requests asking Claude to repair cues.
    return structuredClone(approved) as MotionLesson;
  }
}

type Word = { word: string; start: number; end: number };
function tokens(text: string): string[] {
  return (
    speechText(
      text
        .replace(/(\d)(cm|mm|km|kg|ml)\b/gi, "$1 $2")
        .replace(/\bcm\b/gi, "xăng ti mét")
        .replace(/xen[ -]ti[ -]mét/gi, "xăng ti mét")
        .replace(/\bmm\b/gi, "mi li mét")
        .replace(/\bkm\b/gi, "ki lô mét")
        .replace(/\bkg\b/gi, "ki lô gam")
        .replace(/\bml\b/gi, "mi li lít"),
    )
      .toLowerCase()
      .normalize("NFD")
      .replace(/đ/g, "d")
      .replace(/\p{M}/gu, "")
      .replace(/\b(?:xang|xen|xan|cang|cen)[ -]*ti[ -]*met\b/g, "cm")
      .replace(/\bcentimet(?:er|re)?s?\b/g, "cm")
      .replace(/\bki[ -]*lo[ -]*met\b/g, "km")
      .replace(/\bki[ -]*lo[ -]*gam\b/g, "kg")
      .match(/[a-z0-9]+/g) ?? []
  );
}
export function alignMotion(
  lesson: MotionLesson,
  clips: { start: number; end: number }[],
  words: Word[],
): MotionEvent[] {
  if (
    !words.length ||
    words.some(
      (w) =>
        !Number.isFinite(w.start) ||
        !Number.isFinite(w.end) ||
        w.start < 0 ||
        w.end < w.start,
    )
  )
    throw new AppError("Chưa kiểm tra được mốc lời đọc. Em hãy thử lại.", 502);
  // Whisper sometimes splits the Vietnamese unit into “x” + “antimét”.
  // Merge only that recognized unit; keep mathematical x / nhân untouched.
  words = words.flatMap((w, i, all) => {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^a-z]/g, "");
    if (
      norm(w.word) === "x" &&
      all[i + 1] &&
      /^(?:antimet|antimed|cm)$/.test(norm(all[i + 1].word))
    )
      return [{ word: "cm", start: w.start, end: all[i + 1].end }];
    if (
      i > 0 &&
      norm(all[i - 1].word) === "x" &&
      /^(?:antimet|antimed|cm)$/.test(norm(w.word))
    )
      return [];
    return [w];
  });
  const events: MotionEvent[] = [];
  lesson.segments.forEach((segment, segmentIndex) => {
    const clip = clips[segmentIndex];
    const expected = tokens(segment.narration);
    const actual = words
      .filter((w) => w.start >= clip.start - 0.15 && w.start < clip.end)
      .flatMap((w) =>
        // Whisper normalizes “bốn chục” to “40”. Both express the
        // same quantity; preserve the original word's audio interval.
        tokens(
          segment.id === "tens"
            ? w.word.replace(
                /\b(30|40|80)\b/g,
                (n) =>
                  ({ "30": "ba chục", "40": "bốn chục", "80": "tám chục" })[n]!,
              )
            : w.word.trim().toLowerCase() === "x" && expected.includes("nhan")
              ? "nhân"
              : w.word,
        ).map((text, i, all) => ({
          text,
          start: w.start + ((w.end - w.start) * i) / all.length,
        })),
      );
    const dp = Array.from({ length: expected.length + 1 }, (_, i) =>
      Array.from({ length: actual.length + 1 }, (_, j) =>
        i === 0 ? j : j === 0 ? i : 0,
      ),
    );
    for (let i = 1; i <= expected.length; i++)
      for (let j = 1; j <= actual.length; j++)
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + Number(expected[i - 1] !== actual[j - 1].text),
        );
    const mapping = new Map<number, number>();
    let i = expected.length,
      j = actual.length;
    while (i || j) {
      if (
        i &&
        j &&
        dp[i][j] ===
          dp[i - 1][j - 1] + Number(expected[i - 1] !== actual[j - 1].text)
      ) {
        if (expected[i - 1] === actual[j - 1].text) mapping.set(i - 1, j - 1);
        i--;
        j--;
      } else if (i && dp[i][j] === dp[i - 1][j] + 1) i--;
      else j--;
    }
    // ASR often invents an outro inside quiet audio. Extra recognized words
    // are never narration or cues. Require high coverage of the source instead.
    if (mapping.size / expected.length < 0.8)
      throw new AppError("Lời đọc chưa khớp kịch bản. Em hãy thử lại.", 502);
    for (const cue of segment.cues) {
      const offset = tokens(
        segment.narration.slice(0, segment.narration.indexOf(cue.phrase)),
      ).length;
      const found = mapping.get(offset);
      if (found === undefined)
        throw new AppError(
          "Chưa căn được chuyển động theo lời đọc. Em hãy thử lại.",
          502,
        );
      events.push({
        ...cue,
        time: Math.max(
          clip.start,
          Math.min(actual[found].start, clip.end - 0.3),
        ),
      });
    }
  });
  // Some same-word ASR normalizations can invert adjacent actions. Reject those.
  for (let i = 1; i < events.length; i++)
    if (events[i].time < events[i - 1].time)
      throw new AppError(
        "Mốc chuyển động chưa đúng thứ tự lời giải. Em hãy thử lại.",
        502,
      );
  return events;
}
export async function transcribeMotion(
  wav: Buffer,
  hint?: string,
  model = "openai/whisper-large-v3",
): Promise<Word[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(
      "https://openrouter.ai/api/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input_audio: { data: wav.toString("base64"), format: "wav" },
          language: "vi",
          response_format: "verbose_json",
          timestamp_granularities: ["word"],
          word_timestamps: true,
          temperature: 0,
          // Provider-native vocabulary hint, documented by OpenRouter STT.
          ...(hint
            ? {
                provider: {
                  options: { groq: { prompt: hint.slice(0, 1200) } },
                },
              }
            : {}),
        }),
        signal: AbortSignal.timeout(150000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new AppError("Chưa căn được lời đọc. Em hãy thử lại.", 502);
    }
    const json = await response.json();
    const parsed = z
      .array(
        z.object({
          word: z.string(),
          start: z.number().nonnegative(),
          end: z.number().nonnegative(),
        }),
      )
      .safeParse(json.words);
    if (parsed.success && parsed.data.length) return parsed.data;
  }
  throw new AppError("Dịch vụ chưa trả mốc từng từ. Em hãy thử lại.", 502);
}
