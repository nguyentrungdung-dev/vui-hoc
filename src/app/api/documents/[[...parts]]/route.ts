import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { publicDocument, type DocumentJob } from "@/lib/documents";
import { AppError, createSchema, sniffMime } from "@/server/validation";
import { filePath, lock, readJob, updateJob, writeJob } from "@/server/store";
import { modelName } from "@/server/analysis";
import { listLibraryJobs, readLibraryJob } from "@/server/library";
import { enqueue } from "@/server/dispatch";
import {
  storageMode,
  requireStorage,
  authorizeBlobUpload,
  completeBlobUpload,
  openSource,
} from "@/server/source-files";

import { preparePack } from "@/server/generation";
import {
  learningView,
  startLearningRun,
  readRun,
  changeRun,
  learningHistory,
} from "@/server/learning-runs";
import { runView } from "@/lib/learning";
import { createRevision, revisionCatalog } from "@/server/revision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
type Context = { params: Promise<{ parts?: string[] }> };
const cookieName = "vuihoc-library";

function identity(request: NextRequest) {
  const value = request.cookies.get(cookieName)?.value;
  const token =
    value && /^[a-f0-9]{64}$/.test(value)
      ? value
      : randomBytes(32).toString("hex");
  return {
    owner: createHash("sha256").update(token).digest("hex"),
    token,
    fresh: token !== value,
  };
}
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  // Next may reconstruct request.url with localhost behind its own server.
  // Host is the browser-facing authority; never trust forwarded-host here.
  const host = request.headers.get("host") || new URL(request.url).host;
  let valid = false;
  try {
    const source = new URL(origin || "");
    valid =
      ["http:", "https:"].includes(source.protocol) && source.host === host;
  } catch {}
  if (!valid)
    throw new AppError(
      "Yêu cầu không hợp lệ. Hãy tải lại trang và thử lại.",
      403,
    );
}
async function jsonBody(request: NextRequest) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("Yêu cầu cần có định dạng JSON.", 415);
  if (!request.body) throw new AppError("Thiếu nội dung yêu cầu.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 64 * 1024) {
        await reader.cancel();
        throw new AppError("Thông tin tài liệu quá dài.", 413);
      }
      chunks.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AppError("Thông tin tài liệu chưa hợp lệ.");
    }
  } finally {
    reader.releaseLock();
  }
}
async function handler(request: NextRequest, context: Context) {
  const session = identity(request);
  try {
    const parts = (await context.params).parts ?? [];
    const method = request.method;
    if (method !== "GET") sameOrigin(request);
    let response: NextResponse;
    if (method === "GET" && parts.join("/") === "config") {
      response = NextResponse.json({
        configured: !!process.env.OPENROUTER_API_KEY?.trim(),
        storage: storageMode(),
        storageConfigured:
          storageMode() === "local" ||
          !!process.env.BLOB_READ_WRITE_TOKEN?.trim(),
        model: modelName(),
        sharedLibrary: true,
      });
    } else if (
      parts.length === 1 &&
      parts[0] === "revision" &&
      method === "GET"
    ) {
      response = NextResponse.json(await revisionCatalog(session.owner));
    } else if (
      parts.length === 1 &&
      parts[0] === "revision" &&
      method === "POST"
    ) {
      const job = await createRevision(session.owner, await jsonBody(request));
      // The saved set can be reopened and retried even if dispatch fails.
      await enqueue("learning", job.id, job.learningExecution!).catch(() => {});
      response = NextResponse.json({ id: job.id }, { status: 201 });
    } else if (
      parts.length === 1 &&
      parts[0] === "history" &&
      method === "GET"
    ) {
      response = NextResponse.json({
        runs: await learningHistory(session.owner),
      });
    } else if (
      parts.length === 2 &&
      parts[1] === "learning" &&
      method === "GET"
    ) {
      response = NextResponse.json(
        await learningView(
          await readLibraryJob(parts[0], session.owner),
          session.owner,
        ),
      );
    } else if (
      parts.length === 2 &&
      parts[1] === "generate" &&
      method === "POST"
    ) {
      const input = await jsonBody(request);
      const execution = randomUUID();
      const job = await updateJob(
        parts[0],
        (j) => {
          j.learning = preparePack(j, input);
          if (j.learning.status === "queued") j.learningExecution = execution;
        },
        session.owner,
      );
      if (job.learning?.status === "queued")
        await enqueue("learning", job.id, execution);
      response = NextResponse.json(
        await learningView(await readJob(job.id, session.owner), session.owner),
      );
    } else if (parts.length === 2 && parts[1] === "runs" && method === "POST") {
      response = NextResponse.json(
        await startLearningRun(
          parts[0],
          session.owner,
          await jsonBody(request),
        ),
      );
    } else if (parts.length === 3 && parts[1] === "runs" && method === "GET") {
      response = NextResponse.json(
        runView(await readRun(parts[0], parts[2], session.owner)),
      );
    } else if (parts.length === 3 && parts[1] === "runs" && method === "POST") {
      response = NextResponse.json(
        await changeRun(
          parts[0],
          parts[2],
          session.owner,
          await jsonBody(request),
        ),
      );
    } else if (!parts.length && method === "GET") {
      response = NextResponse.json({
        documents: (await listLibraryJobs(session.owner))
          .filter((job) => !job.revision)
          .map((job) => publicDocument(job, session.owner)),
      });
    } else if (!parts.length && method === "POST") {
      requireStorage();
      const parsed = createSchema.safeParse(await jsonBody(request));
      if (!parsed.success)
        throw new AppError(
          parsed.error.issues.find((i) => i.code === "custom")?.message ||
            "Kiểm tra tên buổi học, loại tệp, số câu và dung lượng (tối đa 100 MB).",
        );
      const input = parsed.data;
      const now = new Date().toISOString();
      const job: DocumentJob = {
        ...input,
        files: input.files.map((f) => ({ ...f, uploaded: false })),
        id: randomUUID(),
        storage: storageMode(),
        owner: session.owner,
        createdAt: now,
        updatedAt: now,
        status: "uploading",
        message: "Đang chờ tải tệp…",
        totalPages: 0,
        selectedPages: [],
        completedPages: [],
        batches: [],
        model: modelName(),
      };
      await writeJob(job);
      response = NextResponse.json(publicDocument(job, session.owner), {
        status: 201,
      });
    } else if (parts.length === 1 && method === "GET") {
      response = NextResponse.json(
        publicDocument(
          await readLibraryJob(parts[0], session.owner),
          session.owner,
        ),
      );
    } else if (
      parts.length === 2 &&
      method === "POST" &&
      ["start", "retry"].includes(parts[1])
    ) {
      const execution = randomUUID();
      const job = await updateJob(
        parts[0],
        (j) => {
          const allowed =
            parts[1] === "start"
              ? ["uploading"]
              : ["failed", "partial", "waiting_config"];
          if (!allowed.includes(j.status))
            throw new AppError(
              "Tài liệu đã được xử lý hoặc đang trong hàng chờ.",
              409,
            );
          if (j.files.some((f) => !f.uploaded))
            throw new AppError("Chưa tải đủ tệp. Hãy quay lại tải tài liệu.");
          j.analysisExecution = execution;
          j.status = "queued";
          j.message = "Đã lưu tài liệu. Đang chờ nhận diện…";
          for (const b of j.batches) if (!b.result) delete b.error;
        },
        session.owner,
      );
      await enqueue("analysis", job.id, execution);
      response = NextResponse.json(
        publicDocument(await readJob(job.id, session.owner), session.owner),
      );
    } else if (
      parts.length === 4 &&
      parts[1] === "files" &&
      /^\d+$/.test(parts[2]) &&
      method === "POST" &&
      ["token", "complete"].includes(parts[3])
    ) {
      const index = Number(parts[2]);
      if (parts[3] === "token") {
        response = NextResponse.json(
          await authorizeBlobUpload(
            request,
            await jsonBody(request),
            parts[0],
            index,
            session.owner,
          ),
        );
      } else {
        await completeBlobUpload(parts[0], index, session.owner);
        response = NextResponse.json({ uploaded: true });
      }
    } else if (
      parts.length === 3 &&
      parts[1] === "files" &&
      /^\d+$/.test(parts[2])
    ) {
      const index = Number(parts[2]);
      const job =
        method === "GET"
          ? await readLibraryJob(parts[0], session.owner)
          : await readJob(parts[0], session.owner);
      const file = job.files[index];
      if (!file) throw new AppError("Không tìm thấy tệp.", 404);
      const target = filePath(job.id, index);
      if (method === "GET") {
        if (!file.uploaded) throw new AppError("Tệp chưa tải xong.", 404);
        const stream = await openSource(job, index);
        response = new NextResponse(stream, {
          headers: {
            "Content-Type": file.mime,
            "Content-Length": String(file.size),
            "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`,
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
          },
        });
      } else if (method === "PUT") {
        if (job.storage === "blob")
          throw new AppError("Hãy tải trực tiếp vào kho tài liệu.", 409);
        if (job.status !== "uploading")
          throw new AppError(
            "Không thể thay tệp sau khi bắt đầu nhận diện.",
            409,
          );
        if (!request.body) throw new AppError("Tệp rỗng.");
        await lock(target, async () => {
          const latest = await readJob(job.id, session.owner);
          if (latest.status !== "uploading" || latest.files[index].uploaded)
            throw new AppError("Tệp đã tải xong hoặc đang được xử lý.", 409);
          const temp = `${target}.uploading`;
          const handle = await fs.open(temp, "w", 0o600);
          const reader = request.body!.getReader();
          let size = 0;
          let header = Buffer.alloc(0);
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              size += value.byteLength;
              if (size > file.size) {
                await reader.cancel();
                throw new AppError(
                  "Dung lượng tệp không khớp hoặc vượt giới hạn.",
                  413,
                );
              }
              if (header.length < 16)
                header = Buffer.concat([
                  header,
                  Buffer.from(value).subarray(0, 16 - header.length),
                ]);
              await handle.writeFile(value);
            }
            if (size !== file.size || sniffMime(header) !== file.mime)
              throw new AppError(
                "Nội dung tệp không khớp định dạng hoặc tệp chưa tải đủ. Hãy chọn lại PDF/JPG/PNG/WebP.",
              );
            await handle.close();
            await fs.rename(temp, target);
            await updateJob(
              job.id,
              (j) => {
                j.files[index].uploaded = true;
              },
              session.owner,
            );
          } catch (error) {
            await handle.close().catch(() => {});
            await fs.unlink(temp).catch(() => {});
            throw error;
          } finally {
            reader.releaseLock();
          }
        });
        response = NextResponse.json({ uploaded: true });
      } else throw new AppError("Phương thức chưa được hỗ trợ.", 405);
    } else throw new AppError("Không tìm thấy đường dẫn.", 404);
    if (session.fresh)
      response.cookies.set(cookieName, session.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(request.url).protocol === "https:",
        maxAge: 365 * 86400,
        path: "/",
      });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AppError
            ? error.message
            : "Hệ thống chưa xử lý được yêu cầu. Hãy thử lại.",
      },
      {
        status: error instanceof AppError ? error.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
export const GET = handler;
export const POST = handler;
export const PUT = handler;
