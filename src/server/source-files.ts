import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { get, head, del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { DocumentJob } from "../lib/documents";
import { databaseEnabled } from "./database";
import { filePath, readJob, updateJob } from "./store";
import { AppError, sniffMime } from "./validation";

export const sourceStorage = { get, head, del, handleUpload };

export function storageMode(): "blob" | "local" {
  return databaseEnabled() ? "blob" : "local";
}
export function requireStorage() {
  if (storageMode() === "blob" && !process.env.BLOB_READ_WRITE_TOKEN?.trim())
    throw new AppError(
      "Kho tài liệu chưa được kết nối. Người lớn cần kết nối Vercel Blob Private rồi deploy lại.",
      503,
    );
}
export function blobPath(id: string, index: number) {
  filePath(id, index); // Validate both identifiers before constructing the object key.
  return `documents/${id}/source-${index}`;
}
export async function authorizeBlobUpload(
  request: Request,
  body: HandleUploadBody,
  id: string,
  index: number,
  owner: string,
) {
  requireStorage();
  if (storageMode() !== "blob")
    throw new AppError("Chưa bật kho tài liệu đám mây.", 409);
  // Completion is explicitly verified by the authenticated client endpoint below.
  // No webhook is registered, and this endpoint never trusts a client-supplied URL.
  if (body.type !== "blob.generate-client-token")
    throw new AppError("Yêu cầu tải tệp chưa hợp lệ.");
  return sourceStorage.handleUpload({
    request,
    body,
    onBeforeGenerateToken: async (pathname) => {
      const job = await readJob(id, owner);
      const file = job.files[index];
      if (!file || job.storage !== "blob" || pathname !== blobPath(id, index))
        throw new AppError("Không tìm thấy tệp.", 404);
      if (job.status !== "uploading" || file.uploaded)
        throw new AppError("Tệp đã tải xong hoặc đang được xử lý.", 409);
      return {
        allowedContentTypes: [file.mime],
        maximumSizeInBytes: file.size,
        addRandomSuffix: false,
        allowOverwrite: false,
        validUntil: Date.now() + 60 * 60 * 1000,
      };
    },
  });
}
export async function completeBlobUpload(
  id: string,
  index: number,
  owner: string,
) {
  const job = await readJob(id, owner);
  const file = job.files[index];
  if (!file || job.storage !== "blob")
    throw new AppError("Không tìm thấy tệp.", 404);
  if (file.uploaded) return;
  if (job.status !== "uploading")
    throw new AppError("Tài liệu đã được xử lý.", 409);
  const pathname = blobPath(id, index);
  const metadata = await sourceStorage.head(pathname);
  let valid =
    metadata.pathname === pathname &&
    metadata.size === file.size &&
    metadata.contentType === file.mime;
  if (valid) {
    const source = await sourceStorage.get(pathname, {
      access: "private",
      useCache: false,
      abortSignal: AbortSignal.timeout(30000),
    });
    if (!source || source.statusCode !== 200)
      throw new AppError("Chưa đọc được tệp vừa tải. Hãy thử lại.", 502);
    const reader = source.stream.getReader();
    let prefix = Buffer.alloc(0);
    try {
      while (prefix.length < 16) {
        const { done, value } = await reader.read();
        if (done) break;
        prefix = Buffer.concat([
          prefix,
          Buffer.from(value).subarray(0, 16 - prefix.length),
        ]);
      }
      valid = sniffMime(prefix) === file.mime;
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  if (!valid) {
    await sourceStorage.del(pathname);
    throw new AppError(
      "Nội dung tệp không khớp định dạng hoặc dung lượng. Hãy chọn lại PDF/JPG/PNG/WebP.",
    );
  }
  await updateJob(
    id,
    (j) => {
      if (j.status !== "uploading" && !j.files[index].uploaded)
        throw new AppError("Tài liệu đã được xử lý.", 409);
      j.files[index].uploaded = true;
    },
    owner,
  );
}
export async function openSource(job: DocumentJob, index: number) {
  const file = job.files[index];
  if (!file?.uploaded) throw new AppError("Tệp chưa tải xong.", 404);
  if (job.storage === "blob") {
    const source = await sourceStorage.get(blobPath(job.id, index), {
      access: "private",
      abortSignal: AbortSignal.timeout(120000),
    });
    if (!source || source.statusCode !== 200)
      throw new AppError("Không đọc được tệp nguồn. Hãy thử lại.", 502);
    return source.stream;
  }
  // Never fall back to ephemeral disk for a document stored in the cloud database.
  if (databaseEnabled())
    throw new AppError("Tài liệu này chưa có tệp nguồn trên kho đám mây.", 409);
  return Readable.toWeb(
    createReadStream(filePath(job.id, index)),
  ) as ReadableStream<Uint8Array>;
}
export async function readSourceFile(job: DocumentJob, index: number) {
  if (job.storage !== "blob" && !databaseEnabled())
    return fs.readFile(filePath(job.id, index));
  const stream = await openSource(job, index);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > job.files[index].size)
        throw new AppError("Dung lượng tệp nguồn không khớp.");
      chunks.push(value);
    }
    if (size !== job.files[index].size)
      throw new AppError("Tệp nguồn chưa tải đủ.");
    return Buffer.concat(chunks);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
