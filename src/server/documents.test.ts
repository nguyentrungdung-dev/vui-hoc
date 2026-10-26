import { test, after, mock } from "node:test";
import { dispatcher } from "./dispatch";
mock.method(dispatcher, "start", async () => {});
import assert from "node:assert/strict";
import { promises as fs, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { NextRequest } from "next/server";
import {
  createSchema,
  parsePages,
  sniffMime,
  validateBatch,
} from "./validation";
import {
  analyzeContent,
  loadPdf,
  normalizeImage,
  processJob,
  splitPdf,
} from "./analysis";
import { filePath, readJob, updateJob, writeJob } from "./store";
import { publicDocument, type DocumentJob } from "../lib/documents";
import { GET, POST, PUT } from "../app/api/documents/[[...parts]]/route";

const root = mkdtempSync(path.join(os.tmpdir(), "vuihoc-tests-"));
process.env.VUIHOC_DATA_DIR = root;
const originalKey = process.env.OPENROUTER_API_KEY;
delete process.env.OPENROUTER_API_KEY;
after(async () => {
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
  await fs.rm(root, { recursive: true, force: true });
});
const valid = (page = 1) => ({
  summary: "Bài cộng",
  pages: [
    {
      page,
      text: "1. 12 + 5 = ?",
      topics: ["Cộng trong phạm vi 20"],
      issues: [],
    },
  ],
  questions: [
    {
      label: "Câu 1",
      prompt: "12 + 5 = ?",
      passage: "",
      options: [
        { label: "A", text: "17" },
        { label: "B", text: "18" },
      ],
      topic: "Cộng trong phạm vi 20",
      skill: "Cộng không nhớ",
      kind: "multiple_choice",
      sourcePages: [page],
      hasFigure: false,
      figureDescription: "",
      needsReview: false,
      issues: [],
    },
  ],
});
async function pdfBytes(count = 1) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < count; i++)
    pdf
      .addPage([400, 500])
      .drawText(`Page ${i + 1}: 12 + 5 = ?`, { x: 30, y: 430, font, size: 18 });
  return Buffer.from(await pdf.save());
}
const createInput = (size: number) => ({
  title: "Test Toán",
  subject: "math",
  mode: "weekly",
  practiceCount: 25,
  pageRange: "",
  files: [{ name: "worksheet.pdf", mime: "application/pdf", size }],
});
function request(
  method: string,
  parts: string[],
  body?: BodyInit,
  cookie?: string,
  origin = "http://localhost:3100",
) {
  return new NextRequest(
    `http://localhost:3100/api/documents${parts.length ? "/" + parts.join("/") : ""}`,
    {
      method,
      headers: {
        origin,
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      ...(body !== undefined ? { body } : {}),
    },
  );
}
const context = (parts: string[]) => ({ params: Promise.resolve({ parts }) });

test("Page selection deduplicates and rejects zero, reversed, overflow and excessive pages", () => {
  assert.deepEqual(parsePages("3, 1-3, 5", 5), [1, 2, 3, 5]);
  assert.deepEqual(parsePages("", 2), [1, 2]);
  for (const s of ["0", "3-1", "1-9999999999999", "2x", "1,"])
    assert.throws(() => parsePages(s, 5));
  assert.throws(() => parsePages("", 101));
});
test("Upload metadata checks total size and mismatched TIMO subject", () => {
  assert.equal(createSchema.safeParse(createInput(10)).success, true);
  assert.equal(
    createSchema.safeParse({
      ...createInput(10),
      subject: "english",
      mode: "timo",
    }).success,
    false,
  );
  assert.equal(
    createSchema.safeParse(createInput(101 * 1024 * 1024)).success,
    false,
  );
  assert.equal(
    createSchema.safeParse({
      ...createInput(10),
      files: [
        { name: "a.jpg", mime: "image/jpeg", size: 60 * 1024 * 1024 },
        { name: "b.jpg", mime: "image/jpeg", size: 60 * 1024 * 1024 },
      ],
    }).success,
    false,
  );
});
test("Actual PDF splitting preserves selected pages; corrupt PDFs and spoofed files fail", async () => {
  const bytes = await pdfBytes(4);
  assert.equal(sniffMime(bytes), "application/pdf");
  const pdf = await loadPdf(bytes);
  const split = await loadPdf(await splitPdf(pdf, [2, 4]));
  assert.equal(split.getPageCount(), 2);
  assert.equal(sniffMime(Buffer.from("<script>alert(1)</script>")), null);
  await assert.rejects(loadPdf(Buffer.from("broken pdf")));
});
test("Actual PNG is converted to JPEG and bad images are rejected", async () => {
  const png = await sharp({
    create: { width: 100, height: 150, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const normalized = await normalizeImage(png);
  const metadata = await sharp(normalized).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 100);
  assert.equal(sniffMime(png), "image/png");
  await assert.rejects(normalizeImage(Buffer.from("not an image")));
});
test("AI output validates page identity and flags unclear questions, without inventing a solution", () => {
  assert.equal(validateBatch(valid(), [1]).questions.length, 1);
  assert.throws(() => validateBatch(valid(2), [1]));
  assert.throws(() => validateBatch({ ...valid(), pages: [] }, [1]));
  assert.throws(() => validateBatch({ ...valid(), secret: "unexpected" }, [1]));
  const unclear = valid();
  unclear.questions[0].prompt = "";
  assert.equal(validateBatch(unclear, [1]).questions[0].needsReview, true);
});
test("OpenRouter contract uses native PDF, strict schema and keeps API key only in auth header", async () => {
  let called = false;
  const result = await analyzeContent(
    { subject: "math", mode: "timo" },
    [1],
    [
      {
        type: "file",
        file: {
          filename: "one.pdf",
          file_data: "data:application/pdf;base64,dGVzdA==",
        },
      },
    ],
    {
      apiKey: "test-only-key",
      fetcher: async (url, init) => {
        called = true;
        assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
        const body = JSON.parse(init!.body as string);
        assert.equal(body.plugins[0].pdf.engine, "native");
        assert.equal(body.response_format.json_schema.strict, true);
        assert.equal(body.provider.require_parameters, true);
        assert.equal(JSON.stringify(body).includes("test-only-key"), false);
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(valid()) },
            },
          ],
        });
      },
    },
  );
  assert.ok(called);
  assert.equal(result.questions[0].prompt, "12 + 5 = ?");
  await assert.rejects(
    analyzeContent({ subject: "english", mode: "weekly" }, [1], [], {
      apiKey: "test",
      fetcher: async () =>
        Response.json({
          choices: [{ finish_reason: "length", message: { content: "{}" } }],
        }),
    }),
    /chưa trả đủ/,
  );
  await assert.rejects(
    analyzeContent({ subject: "self", mode: "weekly" }, [1], [], {
      apiKey: "test",
      fetcher: async () => new Response(null, { status: 401 }),
    }),
    /Khóa OpenRouter/,
  );
});
test("API shares uploaded PDFs while protecting unfinished uploads and creator-only mutations", async () => {
  const bytes = await pdfBytes();
  const response = await POST(
    request("POST", [], JSON.stringify(createInput(bytes.length))),
    context([]),
  );
  assert.equal(response.status, 201);
  const job = await response.json();
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  const parts = [job.id, "files", "0"];
  assert.equal(
    (await GET(request("GET", [job.id]), context([job.id]))).status,
    404,
  );
  const drafts = await (await GET(request("GET", []), context([]))).json();
  assert.equal(
    drafts.documents.some((d: { id: string }) => d.id === job.id),
    false,
  );

  const bad = Buffer.alloc(bytes.length, 65);
  assert.equal(
    (await PUT(request("PUT", parts, bad, cookie), context(parts))).status,
    400,
  );
  assert.equal(
    (await PUT(request("PUT", parts, bytes, cookie), context(parts))).status,
    200,
  );
  assert.equal(
    (await PUT(request("PUT", parts, bytes, cookie), context(parts))).status,
    409,
  );
  const download = await GET(
    request("GET", parts, undefined, cookie),
    context(parts),
  );
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  assert.equal(
    (await GET(request("GET", [job.id]), context([job.id]))).status,
    200,
  );
  const shared = await (
    await GET(request("GET", [job.id]), context([job.id]))
  ).json();
  assert.equal(shared.canManage, false);
  assert.equal("owner" in shared, false);
  const sharedList = await (await GET(request("GET", []), context([]))).json();
  assert.ok(sharedList.documents.some((d: { id: string }) => d.id === job.id));
  const sharedDownload = await GET(request("GET", parts), context(parts));
  assert.equal(sharedDownload.status, 200);
  assert.deepEqual(Buffer.from(await sharedDownload.arrayBuffer()), bytes);
  assert.equal(
    (await PUT(request("PUT", parts, bytes), context(parts))).status,
    404,
  );
  for (const action of ["start", "retry", "generate"])
    assert.equal(
      (
        await POST(
          request(
            "POST",
            [job.id, action],
            JSON.stringify({ count: 5, topics: [] }),
          ),
          context([job.id, action]),
        )
      ).status,
      404,
    );

  assert.equal(
    (
      await POST(
        request(
          "POST",
          [job.id, "start"],
          undefined,
          cookie,
          "http://evil.example",
        ),
        context([job.id, "start"]),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await POST(
        request("POST", [job.id, "start"], undefined, cookie),
        context([job.id, "start"]),
      )
    ).status,
    200,
  );
  await processJob(job.id);
  const stored = await readJob(job.id);
  assert.equal(stored.status, "waiting_config");
  assert.equal(stored.totalPages, 1);
  assert.equal(publicDocument(stored).questions.length, 0);
  assert.equal("owner" in publicDocument(stored), false);
  assert.equal(
    (
      await POST(
        request("POST", [job.id, "retry"], undefined, cookie),
        context([job.id, "retry"]),
      )
    ).status,
    200,
  );
});
test("Background processing retains successful pages and retries only failed batches", async () => {
  const bytes = await pdfBytes(3);
  const id = randomUUID();
  const now = new Date().toISOString();
  const doc: DocumentJob = {
    id,
    owner: "test-owner",
    title: "Partial",
    subject: "math",
    mode: "weekly",
    practiceCount: 25,
    pageRange: "",
    files: [
      {
        name: "three.pdf",
        mime: "application/pdf",
        size: bytes.length,
        uploaded: true,
      },
    ],
    createdAt: now,
    updatedAt: now,
    status: "queued",
    message: "",
    totalPages: 3,
    selectedPages: [1, 2, 3],
    completedPages: [],
    batches: [],
    model: "test",
  };
  await writeJob(doc);
  await fs.writeFile(filePath(id, 0), bytes);
  const originalFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "test-only";
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls++;
      return calls <= 2
        ? Response.json({
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    ...valid(),
                    pages: [...valid().pages, ...valid(2).pages],
                  }),
                },
              },
            ],
          })
        : Response.json({
            choices: [{ finish_reason: "stop", message: { content: "{}" } }],
          });
    };
    await processJob(id);
    let result = await readJob(id);
    assert.equal(result.status, "partial");
    assert.deepEqual(result.completedPages, [1, 2]);
    assert.equal(calls, 3);
    await updateJob(id, (j) => {
      j.status = "queued";
    });
    calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(valid(3)) },
          },
        ],
      });
    };
    await processJob(id);
    result = await readJob(id);
    assert.equal(result.status, "complete");
    assert.equal(calls, 2);
    assert.deepEqual(result.completedPages, [1, 2, 3]);
    assert.equal(publicDocument(result).questions.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
  }
});

test("Origin validation accepts the browser Host when Next internally uses localhost", async () => {
  const req = new NextRequest("http://localhost:3100/api/documents", {
    method: "POST",
    headers: {
      origin: "http://127.0.0.1:3100",
      host: "127.0.0.1:3100",
      "content-type": "application/json",
    },
    body: JSON.stringify(createInput(20)),
  });
  assert.equal((await POST(req, context([]))).status, 201);
  const crossOrigin = new NextRequest("http://localhost:3100/api/documents", {
    method: "POST",
    headers: {
      origin: "http://evil.example",
      host: "127.0.0.1:3100",
      "content-type": "application/json",
    },
    body: JSON.stringify(createInput(20)),
  });
  assert.equal((await POST(crossOrigin, context([]))).status, 403);
});

test("Interrupted processing preserves saved input for retry", async () => {
  const bytes = await pdfBytes();
  const now = new Date().toISOString();
  const id = randomUUID();
  await writeJob({
    id,
    owner: "test-owner",
    title: "Restart",
    subject: "math",
    mode: "weekly",
    practiceCount: 25,
    pageRange: "",
    files: [
      {
        name: "one.pdf",
        mime: "application/pdf",
        size: bytes.length,
        uploaded: true,
      },
    ],
    createdAt: now,
    updatedAt: now,
    status: "queued",
    message: "",
    totalPages: 0,
    selectedPages: [],
    completedPages: [],
    batches: [],
    model: "test",
  });
  await fs.writeFile(filePath(id, 0), bytes);
  const abort = new AbortController();
  abort.abort();
  await processJob(id, abort.signal);
  assert.equal((await readJob(id)).status, "queued");
  await processJob(id);
  assert.equal((await readJob(id)).status, "waiting_config");
});
