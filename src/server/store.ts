import { databaseEnabled, databaseLock, query } from "./database";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { DocumentJob } from "../lib/documents";
import { AppError } from "./validation";

export const dataRoot = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.VUIHOC_DATA_DIR || ".data",
  );
export function jobDir(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      id,
    )
  )
    throw new AppError("Không tìm thấy tài liệu.", 404);
  return path.join(dataRoot(), "documents", id);
}
export function filePath(id: string, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= 100)
    throw new AppError("Không tìm thấy tệp.", 404);
  return path.join(jobDir(id), `source-${index}`);
}
export async function readJob(
  id: string,
  owner?: string,
): Promise<DocumentJob> {
  jobDir(id);
  let job: DocumentJob;
  if (databaseEnabled()) {
    const result = await query<{ data: DocumentJob }>(
      "SELECT data FROM vuihoc_documents WHERE id = $1 AND ($2::text IS NULL OR owner = $2)",
      [id, owner ?? null],
    );
    if (!result.rows[0])
      throw new AppError("Không tìm thấy tài liệu trong trình duyệt này.", 404);
    return result.rows[0].data;
  }
  try {
    job = JSON.parse(
      await fs.readFile(path.join(jobDir(id), "job.json"), "utf8"),
    );
  } catch {
    throw new AppError("Không tìm thấy tài liệu.", 404);
  }
  if (owner && owner !== job.owner)
    throw new AppError("Không tìm thấy tài liệu trong trình duyệt này.", 404);
  return job;
}
export async function writeJob(job: DocumentJob) {
  jobDir(job.id);
  if (databaseEnabled()) {
    job.updatedAt = new Date().toISOString();
    await query(
      `INSERT INTO vuihoc_documents (id, owner, data) VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now() WHERE vuihoc_documents.owner = EXCLUDED.owner`,
      [job.id, job.owner, JSON.stringify(job)],
    );
    return;
  }
  const dir = jobDir(job.id);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const temp = path.join(dir, `${randomUUID()}.tmp`);
  job.updatedAt = new Date().toISOString();
  await fs.writeFile(temp, JSON.stringify(job), { mode: 0o600 });
  await fs.rename(temp, path.join(dir, "job.json"));
}
export async function lock<T>(
  target: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (databaseEnabled()) return databaseLock(target, fn);
  const lockPath = `${path.isAbsolute(target) ? target : path.join(dataRoot(), target.replace(/:/g, "-"))}.lock`;
  await fs.mkdir(path.dirname(lockPath), { recursive: true, mode: 0o700 });
  let handle;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      handle = await fs.open(lockPath, "wx", 0o600);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const stat = await fs.stat(lockPath).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > 5000) {
        const pid = Number(await fs.readFile(lockPath, "utf8").catch(() => ""));
        let abandoned = !pid && Date.now() - stat.mtimeMs > 120000;
        if (pid > 0)
          try {
            process.kill(pid, 0);
          } catch (e) {
            abandoned = (e as NodeJS.ErrnoException).code === "ESRCH";
          }
        if (abandoned) await fs.unlink(lockPath).catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  if (!handle)
    throw new AppError(
      "Tài liệu đang được cập nhật. Hãy thử lại sau vài giây.",
      409,
    );
  await handle.writeFile(String(process.pid));
  try {
    return await fn();
  } finally {
    await handle.close();
    await fs.unlink(lockPath).catch(() => {});
  }
}
export async function updateJob(
  id: string,
  fn: (job: DocumentJob) => void,
  owner?: string,
) {
  return lock(`document:${id}`, async () => {
    const job = await readJob(id, owner);
    fn(job);
    await writeJob(job);
    return job;
  });
}
export async function listJobs(owner?: string) {
  if (databaseEnabled()) {
    const result = await query<{ data: DocumentJob }>(
      "SELECT data FROM vuihoc_documents WHERE ($1::text IS NULL OR owner = $1) ORDER BY data->>'createdAt' DESC",
      [owner ?? null],
    );
    return result.rows.map((row) => row.data);
  }
  const entries = await fs
    .readdir(path.join(dataRoot(), "documents"))
    .catch(() => []);
  const jobs = await Promise.all(
    entries.map((id) => readJob(id, owner).catch(() => null)),
  );
  return jobs
    .filter((j): j is DocumentJob => !!j)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
