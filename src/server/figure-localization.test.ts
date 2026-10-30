import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { locateQuestionFigures } from "./figure-localization";
import { cropPage } from "./page-images";
import type { AnalysisBatch } from "../lib/documents";
import type { QuestionView } from "../lib/learning";
import { QuestionSourceImages } from "../components/question-source-images";
const source = (): AnalysisBatch => ({
  summary: "",
  pages: [
    {
      page: 1,
      text: "Câu 1. Có bao nhiêu hình?",
      topics: ["Hình"],
      issues: [],
    },
  ],
  questions: [
    {
      label: "Câu 1",
      prompt: "Có bao nhiêu hình?",
      passage: "",
      options: [],
      topic: "Hình",
      skill: "Đếm",
      kind: "short_answer",
      sourcePages: [1],
      hasFigure: true,
      figureDescription: "Hình màu xanh",
      figureRegions: [],
      needsReview: false,
      issues: [],
    },
  ],
});
const question = (): QuestionView => ({
  id: "q",
  sourceIds: ["q"],
  sourcePages: [1],
  topic: "Hình",
  label: "Câu 1",
  prompt: "Có bao nhiêu hình?",
  passage: "",
  options: [],
  hasFigure: true,
  figureDescription: "",
  advanced: false,
  translation: "",
  grading: "ungraded",
});

test("A dedicated locator returns a reviewed figure crop and never substitutes a page", async () => {
  const image = await sharp({
    create: { width: 600, height: 800, channels: 3, background: "white" },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="600" height="800"><rect x="40" y="30" width="300" height="25" fill="black"/><rect x="400" y="300" width="150" height="100" fill="navy"/></svg>',
        ),
      },
    ])
    .png()
    .toBuffer();
  const original = globalThis.fetch,
    key = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test";
  const names: string[] = [];
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body)),
        name = body.response_format.json_schema.name;
      names.push(name);
      let output;
      if (name === "figure_location")
        output = {
          figures: [
            {
              id: "0",
              found: true,
              x: 380,
              y: 280,
              width: 190,
              height: 140,
              reason: "",
            },
          ],
        };
      else {
        const images = body.messages[1].content.filter(
          (c: { type: string }) => c.type === "image_url",
        );
        assert.equal(images.length, 2);
        const cropped = Buffer.from(
          images[1].image_url.url.split(",")[1],
          "base64",
        );
        const meta = await sharp(cropped).metadata();
        assert.ok(meta.width! < 200);
        assert.ok(meta.height! < 150);
        output = {
          figures: [
            {
              id: "0",
              complete: true,
              onlyFigure: true,
              matchesSource: true,
              reason: "",
            },
          ],
        };
      }
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(output) },
          },
        ],
      });
    };
    const batch = source();
    batch.questions[0].needsReview = true;
    batch.questions[0].issues = [
      "Vùng hình được ước lượng từ ảnh trang gốc 1, cần kiểm tra lại khi định vị hình",
      "Chữ trong yêu cầu bị mờ",
    ];
    const result = await locateQuestionFigures(batch, new Map([[1, image]]));
    assert.deepEqual(result.questions[0].issues, ["Chữ trong yêu cầu bị mờ"]);
    assert.equal(result.questions[0].needsReview, true);
    assert.deepEqual(names, ["figure_location", "figure_crop_review"]);
    assert.equal(result.questions[0].figureRegions?.length, 1);
    assert.equal(result.questions[0].figureIssue, undefined);
    const crop = await cropPage(image, result.questions[0].figureRegions![0]);
    const meta = await sharp(crop).metadata();
    assert.equal(meta.width, 158);
    assert.equal(meta.height, 108);
    const html = renderToStaticMarkup(
      createElement(QuestionSourceImages, {
        documentId: "document",
        document: null,
        question: {
          ...question(),
          figureRegions: result.questions[0].figureRegions,
        },
      }),
    );
    assert.match(html, /x=/);
    assert.doesNotMatch(html, /Xem cả trang/);
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = key;
  }
});

test("Missing regions show a figure error instead of embedding the complete page", () => {
  const html = renderToStaticMarkup(
    createElement(QuestionSourceImages, {
      documentId: "document",
      document: null,
      question: question(),
    }),
  );
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /Chưa tách được hình/);
  assert.doesNotMatch(html, /Xem cả trang/);
  assert.equal(
    renderToStaticMarkup(
      createElement(QuestionSourceImages, {
        documentId: "document",
        document: null,
        question: { ...question(), hasFigure: false },
      }),
    ),
    "",
  );
});
