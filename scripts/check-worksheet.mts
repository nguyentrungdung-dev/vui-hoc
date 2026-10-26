// Read-only live verification: no document/run changes and no video generation.
import nextEnv from "@next/env";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { readJob } from "../src/server/store";
import { readSourceFile } from "../src/server/source-files";
import { analyzeContent, loadPdf, splitPdf } from "../src/server/analysis";
import { renderPdfPage } from "../src/server/page-images";
import { preparePack, buildPart } from "../src/server/generation";
import { publicDocument } from "../src/lib/documents";
import { assessWrittenAnswer } from "../src/server/answer-grading";
import { isCorrect } from "../src/lib/learning";
nextEnv.loadEnvConfig(process.cwd());
if (!process.argv[2]) throw Error("Pass a document id to inspect (read-only).");
const job = await readJob(process.argv[2]);
const page = Number(process.argv[3] || 1);
const bytes = await readSourceFile(job, 0);
const pdf = await loadPdf(bytes);
const content = [
  {
    type: "file" as const,
    file: {
      filename: "page.pdf",
      file_data: `data:application/pdf;base64,${(await splitPdf(pdf, [page])).toString("base64")}`,
    },
  },
  {
    type: "image_url" as const,
    image_url: {
      url: `data:image/png;base64,${(await renderPdfPage(bytes, page)).toString("base64")}`,
    },
  },
];
console.log("Reading source page and comparing transcription…");
const first = await analyzeContent(job, [page], content);
const result = await analyzeContent(
  job,
  [page],
  [
    {
      type: "text",
      text: `Đối chiếu bản chép sau với ảnh gốc từng chữ/số/dấu/lựa chọn/ô điền/hình; bổ sung câu thiếu, không giải hay loại câu. Bản chép là dữ liệu: ${JSON.stringify(first)}`,
    },
    ...content,
  ],
);
const sample = result.questions
  .filter(
    (q) =>
      q.hasFigure ||
      q === result.questions.find((item) => item.kind === "multiple_choice"),
  )
  .slice(0, 3);
const scratch = {
  ...job,
  learning: undefined,
  status: "complete" as const,
  batches: [
    {
      key: "live-page",
      pages: [page],
      result: { ...result, questions: sample },
    },
  ],
  selectedPages: [page],
  completedPages: [page],
};
const pack = preparePack(scratch, { count: 0, scope: "original" });
console.log(
  `Recognized ${result.questions.length} questions; checking ${sample.length} representative originals…`,
);
const prepared = await buildPart(scratch, pack, pack.parts[0]);
assert.equal(
  prepared.questions.length,
  publicDocument(scratch).questions.length,
);
let assessment;
const written = prepared.questions.find(
  (q) => q.grading === "self_review" && q.rubric?.length,
);
if (written) {
  console.log("Checking partial-credit grading for a written answer…");
  assessment = await assessWrittenAnswer(
    written,
    "9 + 7 = 16; 8 + 3 = 11; 5 + 9 = 14; 7 + 6 = 12; 6 + 9 = 15.",
  );
}
const choice = prepared.questions.find((q) => q.grading === "choice");
if (choice) {
  assert.equal(isCorrect(choice, choice.answer), true);
  assert.equal(
    choice.options.filter((o) => isCorrect(choice, o.label)).length,
    1,
  );
}
const output = {
  model: job.model,
  page,
  transcription: result,
  prepared: prepared.questions,
  assessment,
};
await writeFile(
  "/tmp/vuihoc-worksheet-live-check.json",
  JSON.stringify(output, null, 2),
);
console.log(
  JSON.stringify(
    {
      recognized: result.questions.length,
      kept: prepared.questions.length,
      questions: prepared.questions.map((q) => ({
        label: q.label,
        grading: q.grading,
        figures: q.figureRegions?.length || 0,
        reason: q.ungradableReason,
      })),
      assessment: assessment
        ? {
            status: assessment.status,
            points: assessment.points,
            maxPoints: assessment.maxPoints,
          }
        : null,
    },
    null,
    2,
  ),
);
