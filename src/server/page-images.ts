import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { join } from "node:path";
import { AppError } from "./validation";
import type { FigureRegion } from "../lib/documents";

// PDF.js must see canvas geometry implementations before its module is evaluated.
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
const assetRoot = join(process.cwd(), "node_modules", "pdfjs-dist");
export async function renderPdfPage(bytes: Uint8Array, pageNumber: number) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    standardFontDataUrl: join(assetRoot, "standard_fonts/"),
    cMapUrl: join(assetRoot, "cmaps/"),
    wasmUrl: join(assetRoot, "wasm/"),
  });
  const pdf = await task.promise;
  try {
    if (
      !Number.isSafeInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pdf.numPages
    )
      throw new AppError("Trang hình không hợp lệ.", 404);
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: Math.min(2.5, 2200 / Math.max(base.width, base.height)),
    });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    await page.render({
      canvas: canvas as never,
      canvasContext: canvas.getContext("2d") as never,
      viewport,
    }).promise;
    return canvas.toBuffer("image/png");
  } finally {
    await task.destroy();
  }
}
export async function cropPage(
  image: Buffer,
  region?: Omit<FigureRegion, "page">,
) {
  if (!region) return image;
  const { x, y, width, height } = region;
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > 1.001 ||
    y + height > 1.001
  )
    throw new AppError("Vùng hình không hợp lệ.");
  const metadata = await sharp(image).metadata();
  const w = metadata.width!,
    h = metadata.height!;
  const left = Math.min(w - 1, Math.floor(x * w)),
    top = Math.min(h - 1, Math.floor(y * h));
  return sharp(image)
    .extract({
      left,
      top,
      width: Math.max(1, Math.min(w - left, Math.ceil(width * w))),
      height: Math.max(1, Math.min(h - top, Math.ceil(height * h))),
    })
    .png()
    .toBuffer();
}
