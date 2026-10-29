import { testStudent } from "./test-support/accounts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import { cropPage, renderPdfPage } from "./page-images";

test("PDF figures render from original pixels and crops keep the correct region", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 100]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    color: rgb(1, 0, 0),
  });
  page.drawRectangle({
    x: 100,
    y: 0,
    width: 100,
    height: 100,
    color: rgb(0, 0, 1),
  });
  const image = await renderPdfPage(await doc.save(), 1);
  const cropped = await cropPage(image, {
    x: 0.5,
    y: 0,
    width: 0.5,
    height: 1,
  });
  const stats = await sharp(cropped).stats();
  assert.ok(stats.channels[2].mean > 250);
  assert.ok(stats.channels[0].mean < 5);
  assert.equal((await sharp(cropped).metadata()).width, 250);
  await assert.rejects(
    cropPage(image, { x: 0.8, y: 0, width: 0.5, height: 1 }),
  );
  await assert.rejects(renderPdfPage(await doc.save(), 2));
});

test("Page image endpoint enforces document access, page bounds and crop geometry", async () => {
  const { NextRequest } = await import("next/server");
  const { GET } = await import("../app/api/documents/[[...parts]]/route");
  const { writeJob, filePath } = await import("./store");
  const { randomUUID } = await import("node:crypto");
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = await mkdtemp(join(tmpdir(), "vuihoc-page-api-"));
  const previous = process.env.VUIHOC_DATA_DIR;
  process.env.VUIHOC_DATA_DIR = root;
  try {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    const bytes = await doc.save();
    const job = {
      id: randomUUID(),
      owner: "owner",
      title: "Hình gốc",
      subject: "math" as const,
      mode: "weekly" as const,
      practiceCount: 5,
      pageRange: "",
      files: [
        {
          name: "page.pdf",
          mime: "application/pdf",
          size: bytes.length,
          uploaded: true,
        },
      ],
      status: "complete" as const,
      message: "",
      model: "test",
      totalPages: 1,
      selectedPages: [1],
      completedPages: [1],
      batches: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await testStudent();
    await writeJob(job);
    await writeFile(filePath(job.id, 0), bytes);
    const get = (page: string, query = "") =>
      GET(
        new NextRequest(
          `http://localhost/api/documents/${job.id}/pages/${page}/image${query}`,
          { headers: { cookie: `vuihoc-session=${"a".repeat(64)}` } },
        ),
        {
          params: Promise.resolve({ parts: [job.id, "pages", page, "image"] }),
        },
      );
    const good = await get("1", "?x=0&y=0&width=0.5&height=0.5");
    assert.equal(good.status, 200);
    assert.equal(good.headers.get("content-type"), "image/png");
    assert.equal(
      (await sharp(Buffer.from(await good.arrayBuffer())).metadata()).width,
      125,
    );
    assert.equal((await get("2")).status, 404);
    assert.equal((await get("1", "?x=0.8&y=0&width=0.5&height=1")).status, 400);
    job.files[0].uploaded = false;
    await writeJob(job);
    assert.equal((await get("1")).status, 404);
  } finally {
    if (previous === undefined) delete process.env.VUIHOC_DATA_DIR;
    else process.env.VUIHOC_DATA_DIR = previous;
    await rm(root, { recursive: true, force: true });
  }
});
