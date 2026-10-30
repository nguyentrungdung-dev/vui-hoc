import { test } from "node:test";
import assert from "node:assert/strict";
import {
  numberedSentences,
  questionPresentation,
  reconcileQuestionContext,
  sourceInstruction,
} from "./question-context";
import type { ExtractedQuestion } from "./documents";
const instruction = "Chuyển các câu sau sang câu nghi vấn.";
const first =
  "Bài 4. " +
  instruction +
  " 1. She is from Australia. 2. They are in the classroom. 3. Your brother plays computer games every day.";
const rest =
  "4. He studies Maths on Mondays. 5. You like watching films. 6. The cat is under the chair. 7. Your parents work in Hanoi. 8. Peter has a new bicycle. 9. The students do their homework after school. 10. It is cold in winter.";
const pages = [
  { page: 2, text: first },
  { page: 3, text: rest },
];
const source = (more: Partial<ExtractedQuestion> = {}): ExtractedQuestion => ({
  id: "head",
  label: "Bài 4",
  prompt: instruction,
  passage: first,
  topic: "Tiếng Anh",
  skill: "Đổi câu",
  kind: "other",
  sourcePages: [2],
  options: [],
  hasFigure: false,
  figureDescription: "",
  answerFields: [1, 2, 3].map((n) => ({ id: String(n), label: String(n) })),
  needsReview: true,
  issues: [
    "Bài 4 chỉ hiển thị 3 câu ở trang gốc 2 và tài liệu kết thúc tại đó; cần kiểm tra.",
  ],
  ...more,
});
const continuation = () =>
  source({
    id: "tail",
    label: "Bài 4 (câu 4–10)",
    prompt: "Bài 4 (đề thiếu yêu cầu đầu bài, chỉ đọc được câu 4–10)",
    passage: rest,
    sourcePages: [3],
    answerFields: [4, 5, 6, 7, 8, 9, 10].map((n) => ({
      id: `b4-${n}`,
      label: String(n),
    })),
    issues: [
      "Thiếu đầu đề Bài 4 và câu 1–3 vì trang trước không có trong nguồn; không xác định được yêu cầu đề",
    ],
  });
test("join the real 2/3 page-boundary pattern, with stable source and answer IDs", () => {
  const input = [source(), continuation()];
  const before = structuredClone(input);
  const result = reconcileQuestionContext(input, pages);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "head");
  assert.equal(result[0].answerFields?.length, 10);
  assert.deepEqual(result[0].sourcePages, [2, 3]);
  assert.equal(result[0].needsReview, false);
  assert.deepEqual(result[0].issues, []);
  assert.deepEqual(
    result[0].answerFields?.map((f) => f.id),
    ["1", "2", "3", "b4-4", "b4-5", "b4-6", "b4-7", "b4-8", "b4-9", "b4-10"],
  );
  assert.deepEqual(input, before);
});
test("do not merge different exercises, missing pages, nonconsecutive numbering, duplicate IDs, or figures", () => {
  for (const override of [
    { label: "Bài 5" },
    { sourcePages: [4] },
    { passage: rest.replace("4. He", "5. He") },
    { hasFigure: true },
    {
      answerFields: continuation().answerFields!.map((f, i) =>
        i === 0 ? { ...f, id: "1" } : f,
      ),
    },
  ]) {
    assert.equal(
      reconcileQuestionContext(
        [source(), { ...continuation(), ...override }],
        pages,
      ).length,
      2,
    );
  }
});
test("real unreadable text/figure diagnostics remain after joining", () => {
  const q = source({ issues: ["Chữ mờ không đọc rõ ở trang 2."] });
  const merged = reconcileQuestionContext([q, continuation()], pages)[0];
  assert.equal(merged.needsReview, true);
  assert.deepEqual(merged.issues, ["Chữ mờ không đọc rõ ở trang 2."]);
});
test("each numbered source sentence stays with its own original answer field", () => {
  const q = source();
  const view = questionPresentation(q, pages);
  assert.equal(view.inline, true);
  assert.equal(view.rows[0].sourceText, "1. She is from Australia.");
  assert.equal(
    view.rows[2].sourceText,
    "3. Your brother plays computer games every day.",
  );
  assert.equal(view.context, "");
});
test("keep a cloze paragraph intact and do not split decimals or in-prose (1) blanks", () => {
  assert.equal(
    numberedSentences(
      "My name is David. I (1) ______ (be) eleven. I (2) ______ (live) here.",
    ),
    null,
  );
  assert.equal(numberedSentences("The value is 1.25 and then 2.75."), null);
  const q = source({
    passage: "I (1) ____ (be) eleven. I (2) ____ (live) here.",
    answerFields: [
      { id: "a", label: "(1) be" },
      { id: "b", label: "(2) live" },
    ],
  });
  assert.equal(questionPresentation(q).inline, false);
});
test("repeat only a heading actually present in the selected source; never infer from topic", () => {
  const q = source({
    label: "Bài 7 - câu 2",
    prompt: "They (is / are) my classmates.",
    sourcePages: [5],
    passage: "",
    answerFields: [],
  });
  const p = [
    {
      page: 5,
      text: "Bài 7. Chọn dạng đúng của động từ 1. My sister (like / likes) reading books. 2. They (is / are) my classmates.",
    },
  ];
  assert.equal(sourceInstruction(q, p)?.text, "Chọn dạng đúng của động từ");
  assert.equal(
    questionPresentation(q, p).instruction,
    "Chọn dạng đúng của động từ",
  );
  assert.equal(questionPresentation(q, []).instruction, "");
  assert.equal(sourceInstruction({ ...q, label: "Bài 8" }, p), null);
});
test("unclear context leaves the passage visible instead of silently dropping source content", () => {
  assert.equal(
    questionPresentation(source({ answerFields: [{ id: "1", label: "1" }] }))
      .inline,
    false,
  );
});

test("new full-sentence labels use the same interleaved layout as legacy numeric labels", () => {
  const q = source({
    answerFields: [
      { id: "a", label: "1. She is from Australia." },
      { id: "b", label: "2. They are in the classroom." },
      { id: "c", label: "3. Your brother plays computer games every day." },
    ],
  });
  assert.equal(questionPresentation(q, pages).inline, true);
  assert.equal(questionPresentation(q, pages).rows[0].id, "a");
});

test("a source heading ending in a colon does not duplicate an existing instruction ending in a period", () => {
  const q = source();
  const p = [
    {
      page: 2,
      text: first.replace(instruction, instruction.replace(/\.$/, ":")),
    },
  ];
  assert.equal(questionPresentation(q, p).instruction, "");
  assert.equal(reconcileQuestionContext([q], p)[0].prompt, instruction);
});

test("display an evidenced task heading once, separated from the sentence being answered", () => {
  const q = source({
    label: "Bài 7 - câu 2",
    prompt: "Chọn dạng đúng của động từ\nThey (is / are) my classmates.",
    sourcePages: [5],
  });
  const view = questionPresentation(q, [
    {
      page: 5,
      text: "Bài 7. Chọn dạng đúng của động từ 1. I (am / is) a student.",
    },
  ]);
  assert.equal(view.instruction, "Chọn dạng đúng của động từ");
  assert.equal(view.prompt, "They (is / are) my classmates.");
  const repeated = questionPresentation(
    source({ prompt: instruction.replace(/\.$/, ":") + "\n" + instruction }),
    pages,
  );
  assert.equal(repeated.prompt, instruction);
  assert.equal(repeated.instruction, "");
});

// Regression: the reported 42-question extraction split page 3 into seven records,
// with no "Bài 4" label. Both page boundaries and same-page fragments must join.
const fragments = () =>
  numberedSentences(rest)!.items.map((item) =>
    source({
      id: `fragment-${item.number}`,
      label: `Câu ${item.number} (trang 3)`,
      prompt: `[không đọc rõ] Yêu cầu của bài chứa câu 4–10 không có trong tài liệu. Câu ${item.number}: ${item.text}`,
      passage: `${item.number}. ${item.text}`,
      sourcePages: [3],
      answerFields: [
        { id: `q${item.number}_ans`, label: `${item.number}. ${item.text}` },
      ],
      issues: [
        "Thiếu đầu đề và yêu cầu của bài; không có hướng dẫn để xác định dạng bài.",
      ],
    }),
  );
test("join all seven anonymous single-sentence fragments using the source heading and exact sentences", () => {
  const input = [source(), ...fragments()];
  const snapshot = structuredClone(input);
  const actual = reconcileQuestionContext(input, pages);
  assert.equal(actual.length, 1);
  assert.equal(actual[0].answerFields!.length, 10);
  assert.equal(actual[0].needsReview, false);
  assert.deepEqual(actual[0].issues, []);
  assert.deepEqual(
    actual[0].answerFields!.map((f) => f.id),
    ["1", "2", "3", ...fragments().map((q) => q.answerFields![0].id)],
  );
  assert.deepEqual(input, snapshot);
  assert.equal(
    questionPresentation(actual[0], pages).rows[9].sourceText,
    "10. It is cold in winter.",
  );
});
test("anonymous continuation requires all selected pages, exact source text and no intervening heading", () => {
  for (const evidence of [
    pages.slice(1),
    [pages[0], { page: 3, text: "Bài 5. " + rest }],
    [
      pages[0],
      { page: 3, text: rest.replace("He studies Maths", "He teaches Maths") },
    ],
  ]) {
    assert.equal(
      reconcileQuestionContext([source(), fragments()[0]], evidence).length,
      2,
    );
  }
});
test("OCR dotted answer lines do not prevent an evidenced continuation", () => {
  const evidence = pages.map((p) => ({
    ...p,
    text: p.text.replace(/\. (?=\d)/g, ". .......... "),
  }));
  assert.equal(
    reconcileQuestionContext([source(), ...fragments()], evidence).length,
    1,
  );
});
