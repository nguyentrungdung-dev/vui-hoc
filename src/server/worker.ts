import { config } from "dotenv";
import { promises as fs } from "node:fs";
import path from "node:path";
import { dataRoot, listJobs, updateJob } from "./store";
import { processJob } from "./analysis";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
async function main() {
  await fs.mkdir(dataRoot(), { recursive: true, mode: 0o700 });
  const lockPath = path.join(dataRoot(), "worker.lock");
  let handle;
  try {
    handle = await fs.open(lockPath, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const pid = Number(await fs.readFile(lockPath, "utf8"));
    let alive = false;
    if (pid > 0) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch (e) {
        alive = (e as NodeJS.ErrnoException).code === "EPERM";
      }
    }
    if (alive) throw new Error("Đã có worker chạy cho thư mục dữ liệu này.");
    await fs.unlink(lockPath);
    handle = await fs.open(lockPath, "wx", 0o600);
  }
  await handle.writeFile(String(process.pid));
  let stopping = false;
  const heartbeatPath = path.join(dataRoot(), "worker-heartbeat");
  const beat = () =>
    fs
      .writeFile(heartbeatPath, new Date().toISOString(), { mode: 0o600 })
      .catch(() => {});
  await beat();
  const heartbeat = setInterval(beat, 5000);
  const shutdown = new AbortController();
  const stop = () => {
    stopping = true;
    shutdown.abort();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  console.log("[worker] Vui học sẵn sàng xử lý tài liệu.");
  try {
    for (const job of await listJobs())
      if (["preparing", "analyzing"].includes(job.status))
        await updateJob(job.id, (j) => {
          j.status = "queued";
          j.message = "Tiếp tục xử lý sau khi khởi động lại.";
        });
    while (!stopping) {
      const jobs = (await listJobs())
        .filter((j) => j.status === "queued")
        .reverse();
      for (const job of jobs) {
        if (stopping) break;
        await processJob(job.id, shutdown.signal);
      }
      if (!stopping) await new Promise((r) => setTimeout(r, 1500));
    }
  } finally {
    clearInterval(heartbeat);
    await handle.close();
    await fs.unlink(lockPath).catch(() => {});
    await fs.unlink(heartbeatPath).catch(() => {});
  }
}
main().catch(() => {
  console.error(
    "[worker] Không khởi động được. Kiểm tra quyền thư mục .data và tiến trình worker đang chạy.",
  );
  process.exitCode = 1;
});
