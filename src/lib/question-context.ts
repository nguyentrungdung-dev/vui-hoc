import type { AnswerField, ExtractedQuestion } from "./documents";

export const QUESTION_CONTEXT_POLICY = "worksheet-context-2026-10-30.2";
export const QUESTION_CONTEXT_RULES = `Mỗi câu phải tự đủ yêu cầu đề bài: chép lại nguyên văn yêu cầu chung vào prompt của từng câu tách nhỏ, không chỉ ghi tên chủ đề. Giữ nguyên câu gốc và ngôn ngữ nguồn. Bài có danh sách câu độc lập: answerFields.label phải gồm số thứ tự và đầy đủ câu nguồn tương ứng, tuyệt đối không chỉ ghi 1, 2, 3. Đoạn văn điền chỗ trống phải giữ nguyên đoạn văn, không tách thành các câu rời làm mất ngữ cảnh. Ngắt trang hoặc ngắt cụm xử lý không phải là kết thúc bài. Đối chiếu số bài, yêu cầu và dãy số ý ở mọi trang được chọn trước khi kết luận thiếu đầu đề/thiếu trang; nếu đủ bằng chứng thì nối phần tiếp theo theo đúng thứ tự. Không đoán yêu cầu từ tên chủ đề, đáp án hoặc ngữ pháp. Chỉ cảnh báo khi dữ kiện thực sự không có/không đọc rõ/mâu thuẫn; mọi câu đã khôi phục ngữ cảnh phải được giải và kiểm định lại trước khi cho điểm.`;

type PageText = { page: number; text: string };
type QuestionText = {
  label: string;
  prompt: string;
  passage: string;
  sourcePages: number[];
  answerFields?: AnswerField[];
};
const tidy = (s: string) => s.normalize("NFC").replace(/\s+/gu, " ").trim();
const taskKey = (s: string) =>
  tidy(s)
    .replace(/[.:;]+$/u, "")
    .toLocaleLowerCase();
const groupNumber = (q: QuestionText) =>
  /(?:Bài|Exercise|Task)\s+(\d+)\b/iu.exec(q.label)?.[1];
const action =
  /^(?:chọn|chia|chuyển|viết|điền|sửa|tìm|đọc|hoàn thành|sắp xếp|nối|choose|complete|rewrite|change|write|fill|correct|put|read|match|rearrange)\b/iu;

/** Only recover a heading explicitly present in a selected source page. */
export function sourceInstruction(q: QuestionText, pages: PageText[]) {
  const group = groupNumber(q);
  if (!group) return null;
  const heading = new RegExp(
    `(?:Bài|Exercise|Task)\\s+${group}\\s*[.:)]\\s*`,
    "giu",
  );
  const firstPage = Math.min(...q.sourcePages);
  for (const page of [...pages]
    .filter((p) => p.page <= firstPage)
    .sort((a, b) => b.page - a.page)) {
    const matches = [...tidy(page.text).matchAll(heading)];
    for (const match of matches.reverse()) {
      const rest = tidy(page.text).slice(match.index! + match[0].length);
      const end =
        /\s+\d+[.)]\s+|(?:Bài|Exercise|Task)\s+\d+[.:)]/iu.exec(rest)?.index ??
        rest.length;
      const text = rest.slice(0, end).trim();
      if (text.length > 3 && text.length <= 400 && action.test(text))
        return { text, page: page.page };
    }
  }
  return null;
}

/** List numbering only; (1) blanks inside prose and decimals are deliberately excluded. */
export function numberedSentences(passage: string, allowSingle = false) {
  const text = passage.replace(
    /^\s*(?:Bài|Exercise|Task)\s+\d+[.:)]?\s*/iu,
    "",
  );
  const matches = [
    ...text.matchAll(/(?:^|\s)(\d{1,3})[.)]\s+(?=[A-Za-zÀ-ỹ_])/gu),
  ];
  if (matches.length < (allowSingle ? 1 : 2)) return null;
  const items = matches.map((m, i) => ({
    number: Number(m[1]),
    text: text
      .slice(m.index! + m[0].length, matches[i + 1]?.index ?? text.length)
      .trim(),
  }));
  if (
    items.some(
      (item, i) =>
        !item.text || (i > 0 && item.number !== items[i - 1].number + 1),
    )
  )
    return null;
  return { prefix: text.slice(0, matches[0].index).trim(), items };
}

export function questionPresentation(q: QuestionText, pages: PageText[] = []) {
  const instruction = sourceInstruction(q, pages);
  let displayPrompt = q.prompt;
  let shownInstruction =
    instruction && !taskKey(q.prompt).includes(taskKey(instruction.text))
      ? instruction.text
      : "";
  if (instruction) {
    const lines = q.prompt
      .split(/\n+/u)
      .map((line) => line.trim())
      .filter(Boolean);
    let removed = false;
    while (lines.length && taskKey(lines[0]) === taskKey(instruction.text)) {
      lines.shift();
      removed = true;
    }
    if (removed) {
      displayPrompt = lines.length ? lines.join("\n") : instruction.text;
      shownInstruction = lines.length ? instruction.text : "";
    }
  }
  const parsed = numberedSentences(q.passage);
  const fields = q.answerFields || [];
  const rows = fields.map((field) => {
    const label = field.label.trim();
    const numeric = /^(?:câu\s*)?\(?(\d+)\)?[.)]?$/iu.exec(label);
    const full = /^(?:câu\s*)?\(?(\d+)\)?[.)]?\s+(.+)$/iu.exec(label);
    const number = numeric?.[1] || full?.[1];
    const item = number
      ? parsed?.items.find(
          (item) =>
            item.number === Number(number) &&
            (!full || tidy(full[2]) === tidy(item.text)),
        )
      : parsed?.items.find((item) => tidy(item.text) === tidy(label));
    return { ...field, sourceText: item ? `${item.number}. ${item.text}` : "" };
  });
  // Keep prose as prose. Inline only when every source sentence maps to exactly one field.
  const inline =
    !!parsed &&
    fields.length === parsed.items.length &&
    rows.every((row) => !!row.sourceText);
  const prefix = inline && parsed ? parsed.prefix : "";
  const context =
    prefix &&
    ![q.prompt, instruction?.text || ""].some(
      (p) => taskKey(p) === taskKey(prefix),
    )
      ? prefix
      : "";
  return {
    instruction: shownInstruction,
    prompt: displayPrompt,
    rows,
    inline,
    context,
  };
}

/** Prove anonymous fragments belong to this heading, before the next exercise.
 * OCR answer lines are layout, not sentence content. Never use topic/answers as evidence.
 */
function evidencedContinuation(
  parent: QuestionText,
  child: QuestionText,
  pages: PageText[],
) {
  const instruction = sourceInstruction(parent, pages);
  const group = groupNumber(parent);
  if (!instruction || !group) return false;
  const end = Math.max(...child.sourcePages);
  const selected = [];
  for (let n = instruction.page; n <= end; n++) {
    const page = pages.find((p) => p.page === n);
    if (!page) return false;
    selected.push(tidy(page.text));
  }
  const text = selected.join(" ");
  const heading = new RegExp(
    `(?:Bài|Exercise|Task)\\s+${group}\\s*[.:)]\\s*`,
    "iu",
  ).exec(text);
  if (!heading) return false;
  const after = text.slice(heading.index + heading[0].length);
  const nextHeading = /(?:Bài|Exercise|Task)\s+\d+\s*[.:)]/iu.exec(after);
  const normalize = (s: string) => tidy(s.replace(/\.{3,}|…+/gu, " "));
  const section = numberedSentences(
    normalize(after.slice(0, nextHeading?.index ?? after.length)),
    true,
  );
  const a = numberedSentences(parent.passage, true);
  const b = numberedSentences(child.passage, true);
  return (
    !!section &&
    !!a &&
    !!b &&
    [...a.items, ...b.items].every((item) =>
      section.items.some(
        (original) =>
          original.number === item.number &&
          normalize(original.text) === normalize(item.text),
      ),
    )
  );
}

const resolvedSplitIssue = (issue: string) =>
  /(?:thiếu đầu đề|thiếu.*(?:trang trước|trang sau|câu\s*\d)|trang trước.*không có|không xác định.*yêu cầu|chỉ hiển thị.*trang|tài liệu kết thúc)/iu.test(
    issue,
  ) && !/(?:chữ mờ|không đọc rõ|hình|mâu thuẫn)/iu.test(issue);
const missingContext =
  /(?:thiếu|không có|không xác định|chỉ.*câu|kết thúc|missing|continu)/iu;
/** Stable IDs; join only explicit same group, adjacent pages and a gap-free numbered sequence. */
export function reconcileQuestionContext(
  questions: ExtractedQuestion[],
  pages: PageText[],
) {
  const result: ExtractedQuestion[] = [];
  for (const source of questions) {
    const q = structuredClone(source);
    let instruction = sourceInstruction(q, pages);
    const previous = result.at(-1);
    const a = previous && numberedSentences(previous.passage);
    const b = numberedSentences(q.passage, true);
    const evidenced = !!previous && evidencedContinuation(previous, q, pages);
    const sameGroup =
      previous &&
      groupNumber(previous) &&
      groupNumber(previous) === groupNumber(q);
    if (
      previous &&
      (sameGroup || (!groupNumber(q) && evidenced)) &&
      a &&
      b &&
      !previous.hasFigure &&
      !q.hasFigure &&
      !previous.options.length &&
      !q.options.length &&
      previous.answerFields?.length === a.items.length &&
      q.answerFields?.length === b.items.length &&
      b.items[0].number === a.items.at(-1)!.number + 1 &&
      (Math.min(...q.sourcePages) === Math.max(...previous.sourcePages) + 1 ||
        (evidenced &&
          Math.min(...q.sourcePages) === Math.max(...previous.sourcePages))) &&
      (instruction ||
        (evidenced && (instruction = sourceInstruction(previous, pages)))) &&
      taskKey(previous.prompt).includes(taskKey(instruction!.text))
    ) {
      // Preserve the two pieces verbatim. IDs of existing answer fields are retained.
      const ids = new Set(previous.answerFields.map((f) => f.id));
      if (q.answerFields.some((f) => ids.has(f.id))) {
        result.push(q);
        continue;
      }
      const unresolvedFlag =
        (previous.needsReview && !previous.issues.length) ||
        (q.needsReview && !q.issues.length);
      previous.passage += `\n${q.passage}`;
      previous.answerFields.push(...q.answerFields);
      previous.sourcePages = [
        ...new Set([...previous.sourcePages, ...q.sourcePages]),
      ].sort((a, b) => a - b);
      // Remove only diagnostics demonstrably about this resolved split; retain all other uncertainty.
      previous.issues = [...previous.issues, ...q.issues].filter(
        (issue) => !resolvedSplitIssue(issue),
      );
      previous.needsReview = unresolvedFlag || previous.issues.length > 0;
      continue;
    }
    if (instruction && !taskKey(q.prompt).includes(taskKey(instruction.text))) {
      // Retain source text; a warning-style placeholder is replaced only by an evidenced instruction.
      q.prompt =
        missingContext.test(q.prompt) && groupNumber(q)
          ? instruction.text
          : `${instruction.text}\n${q.prompt}`;
      const remainingIssues = q.issues.filter(
        (issue) => !/đề bài.*không có trong trang được cung cấp/iu.test(issue),
      );
      if (remainingIssues.length < q.issues.length)
        q.needsReview = remainingIssues.length > 0;
      q.issues = remainingIssues;
      q.sourcePages = [...new Set([instruction.page, ...q.sourcePages])].sort(
        (a, b) => a - b,
      );
    }
    result.push(q);
  }
  return result;
}
