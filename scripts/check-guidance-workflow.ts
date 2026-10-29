/** Exercises the real HTTP dispatcher and Workflow runtime on a separate practice run. */
import { loadEnvConfig } from "@next/env";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readJob, writeJob } from "../src/server/store";
import { startLearningRun } from "../src/server/learning-runs";
import { readGuidance } from "../src/server/guidance-store";
async function main() {
  loadEnvConfig(process.cwd());
  delete process.env.DATABASE_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  Object.assign(process.env, { NODE_ENV: "development" });
  const root = path.resolve(".test-data/video-review-20261029");
  process.env.VUIHOC_DATA_DIR = root;
  const infoPath = path.join(root, "workflow-probe.json");
  const prior = await fs
    .readFile(infoPath, "utf8")
    .then(JSON.parse)
    .catch(() => null);
  const report = JSON.parse(
    await fs.readFile(path.join(root, "review.json"), "utf8"),
  );
  let info = prior;
  if (!info) {
    const doc = await readJob(report.cases.addition.documentId);
    doc.id = randomUUID();
    doc.title = "Nghiệm thu Workflow · Bài sinh thêm TIMO";
    doc.mode = "timo";
    const q = {
      ...doc.learning!.parts[0].questions[0],
      id: "workflow-probe",
      topic: "Bài sinh thêm · Cộng có nhớ",
      prompt: "Tính 47 + 26.",
      answer: "73",
      steps: [
        "7 + 6 = 13. Viết 3, nhớ 1 chục.",
        "4 + 2 + 1 = 7. Viết 7 ở hàng chục.",
        "47 + 26 = 73.",
      ],
      explanation:
        "Cộng hàng đơn vị trước. Mười ba đơn vị gồm một chục và ba đơn vị. Cộng chục nhớ với bốn chục và hai chục để được bảy chục.",
    };
    doc.learning!.id = randomUUID();
    doc.learning!.parts[0].kind = "practice";
    doc.learning!.parts[0].questions = [q];
    await writeJob(doc);
    const run = await startLearningRun(doc.id, "workflow-probe", {
      kind: "practice",
      resume: false,
    });
    info = {
      documentId: doc.id,
      runId: run.id,
      questionId: q.id,
      url: `http://127.0.0.1:3106/luyen-tap/${doc.id}/${run.id}`,
    };
    await fs.writeFile(infoPath, JSON.stringify(info, null, 2));
  }
  const base = "http://127.0.0.1:3106";
  const config = await fetch(base + "/api/documents/config");
  const cookie = config.headers.get("set-cookie")?.split(";")[0] ?? "";
  await config.body?.cancel();
  const started = Date.now();
  const response = await fetch(
    `${base}/api/documents/${info.documentId}/runs/${info.runId}/guidance`,
    {
      method: "POST",
      headers: { origin: base, cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: info.questionId, retry: true }),
    },
  );
  const body = await response.json();
  if (!response.ok) throw Error(JSON.stringify(body));
  let view = body.guidance;
  const guid = view.id;
  console.log("Real HTTP workflow dispatched: " + guid);
  while (
    ["queued", "generating"].includes(view.status) &&
    Date.now() - started < 240000
  ) {
    await new Promise((r) => setTimeout(r, 2000));
    const r = await fetch(
      `${base}/api/documents/${info.documentId}/runs/${info.runId}/guidance/${guid}`,
      { headers: { cookie } },
    );
    view = (await r.json()).guidance;
  }
  const saved = (await readGuidance(info.documentId, guid))!;
  info = {
    ...info,
    guidanceId: guid,
    status: view.status,
    message: view.message,
    template: view.motion?.template,
    duration: view.motion?.duration,
    elapsedSeconds: (Date.now() - started) / 1000,
    workerGenerationSeconds: saved.generationSeconds,
  };
  await fs.writeFile(infoPath, JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info));
  if (view.status !== "ready" || view.motion?.template !== "lesson-v3")
    throw Error("Live Workflow did not complete");
  const again = await fetch(
    `${base}/api/documents/${info.documentId}/runs/${info.runId}/guidance`,
    {
      method: "POST",
      headers: { origin: base, cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: info.questionId }),
    },
  );
  const cached = (await again.json()).guidance;
  if (cached.id !== guid || cached.status !== "ready")
    throw Error("HTTP cache failed");
  console.log(
    "PASS: real HTTP → Workflow → new narration/scenes → Aoede → word cues → ready → cached",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
