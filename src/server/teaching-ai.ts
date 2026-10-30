import { z } from "zod";
import { AppError } from "./validation";
import { modelName } from "./analysis";
// Retrying the draft cannot repair exhausted HTTP retries or a lost connection.
export class TeachingServiceError extends AppError {}
export type AIContent =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } }
  | { type: "image_url"; image_url: { url: string } };
export async function teachingAI<T extends z.ZodType>(
  schema: T,
  name: string,
  system: string,
  content: AIContent[],
  signal?: AbortSignal,
  modelOverride?: string,
): Promise<z.infer<T>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key?.trim())
    throw new AppError(
      "Chưa cấu hình khóa OpenRouter. Điền khóa, khởi động lại và thử lại.",
      503,
    );
  const { $schema: _, ...jsonSchema } = z.toJSONSchema(schema);
  const model = modelOverride || modelName();
  const body = {
    model,
    ...(model.startsWith("anthropic/claude-haiku-5.5")
      ? {}
      : { temperature: 0.2 }),
    max_tokens:
      name === "similar_question_review"
        ? 3500
        : name === "similar_question"
          ? 10000
          : name === "guidance_script"
            ? 1800
            : name === "guidance_story_visuals"
              ? 4500
              : name === "guidance_story"
                ? 6000
                : name === "guidance_story_check"
                  ? 1500
                  : name === "guidance_narration"
                    ? 1800
                    : name === "teaching_review"
                      ? 5000
                      : 16000,
    ...(name.startsWith("guidance_") ? { reasoning: { enabled: false } } : {}),
    provider: { require_parameters: true },
    ...(content.some((c) => c.type === "file")
      ? { plugins: [{ id: "file-parser", pdf: { engine: "native" } }] }
      : {}),
    response_format: {
      type: "json_schema",
      json_schema: { name, strict: true, schema: jsonSchema },
    },
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
  };
  let response: Response | undefined;
  for (let i = 0; i < 3; i++) {
    signal?.throwIfAborted();
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "X-Title": "Vui Hoc MVP",
        },
        body: JSON.stringify(body),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(150000)])
          : AbortSignal.timeout(150000),
      });
    } catch {
      signal?.throwIfAborted();
      throw new TeachingServiceError(
        "Kết nối AI bị gián đoạn hoặc quá thời gian. Các phần đã xong vẫn được lưu.",
        502,
      );
    }
    if (
      response.ok ||
      ![429, 500, 502, 503, 504].includes(response.status) ||
      i === 2
    )
      break;
    await response.body?.cancel();
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  if (!response!.ok) {
    const status = response!.status;
    await response!.body?.cancel();
    throw new TeachingServiceError(
      [401, 403].includes(status)
        ? "Khóa OpenRouter chưa hợp lệ hoặc chưa có quyền."
        : status === 402
          ? "OpenRouter báo chưa đủ số dư hoặc hạn mức (HTTP 402)."
          : status === 429
            ? "AI đang giới hạn lượt xử lý. Thử lại sau ít phút."
            : `AI chưa xử lý được yêu cầu biên soạn (HTTP ${status}). Hãy thử lại.`,
      [401, 402, 403].includes(status) ? 503 : 502,
    );
  }
  const json = await response!.json().catch(() => null);
  const choice = json?.choices?.[0];
  if (
    choice?.finish_reason !== "stop" ||
    typeof choice?.message?.content !== "string"
  )
    throw new AppError("AI trả nội dung chưa đầy đủ. Thử lại phần này.", 502);
  let raw: unknown;
  try {
    raw = JSON.parse(choice.message.content);
  } catch {
    throw new AppError("AI trả JSON chưa hợp lệ. Thử lại phần này.", 502);
  }
  const result = schema.safeParse(raw);
  if (!result.success)
    throw new AppError(
      "Nội dung AI chưa đúng cấu trúc: " +
        result.error.issues
          .slice(0, 8)
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")
          .slice(0, 1800),
      502,
    );
  return result.data;
}
