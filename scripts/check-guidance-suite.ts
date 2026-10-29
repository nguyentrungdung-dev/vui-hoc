import { failGuidance } from "../src/server/guidance";
/** Paid end-to-end acceptance on isolated, durable local sample data only. */
import { loadEnvConfig } from "@next/env";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DocumentJob } from "../src/lib/documents";
import { guidanceSamples } from "./fixtures/guidance-samples";
import { writeJob } from "../src/server/store";
import { startLearningRun } from "../src/server/learning-runs";
import { requestGuidance, guidanceDispatcher } from "../src/server/guidance";
import { readGuidance } from "../src/server/guidance-store";
import { generateGuidanceWorkflow } from "../src/workflows/guidance";

async function main() {
  loadEnvConfig(process.cwd());
  delete process.env.DATABASE_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  Object.assign(process.env, { NODE_ENV: "development" });
  const root = path.resolve(".test-data/video-review-20261029");
  process.env.VUIHOC_DATA_DIR = root;
  await fs.mkdir(root, { recursive: true });
  const reportPath = path.join(root, "review.json");
  const report: { root: string; cases: Record<string, any> } = await fs
    .readFile(reportPath, "utf8")
    .then(JSON.parse)
    .catch(() => ({ root, cases: {} }));
  const rawFetch = globalThis.fetch;
  if (process.argv.includes("--billing-only")) {
    for (const c of Object.values(report.cases)) {
      for (const call of c.calls ?? []) {
        if (call.cost !== null || !call.id || call.status !== 200) continue;
        const r = await rawFetch(
          "https://openrouter.ai/api/v1/generation?id=" +
            encodeURIComponent(call.id),
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (r.ok) call.cost = (await r.json()).data?.total_cost ?? call.cost;
        else await r.body?.cancel();
      }
      c.totalKnownCost = (c.calls ?? []).reduce(
        (n: number, x: any) => n + (x.cost ?? 0),
        0,
      );
      c.missingBilling = (c.calls ?? []).filter(
        (x: any) => x.status === 200 && x.cost === null,
      ).length;
    }
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log("Updated recorded billing; no content generated.");
    return;
  }
  let calls: any[] = [];
  globalThis.fetch = async (input, init) => {
    const start = performance.now();
    const response = await rawFetch(input, init);
    const url = String(input);
    if (url.includes("openrouter.ai/api/v1/")) {
      const body = JSON.parse(String(init?.body || "{}"));
      const json = response.headers
        .get("content-type")
        ?.includes("application/json")
        ? await response
            .clone()
            .json()
            .catch(() => null)
        : null;
      const call = {
        endpoint: url.split("/").at(-1),
        model: body.model,
        id: json?.id ?? response.headers.get("x-generation-id"),
        seconds: (performance.now() - start) / 1000,
        status: response.status,
        cost: json?.usage?.cost ?? null,
        response: json?.choices?.[0]?.message?.content ?? null,
        words: json?.words,
        error: json?.error?.message,
      };
      calls.push(call);
      await fs.writeFile(
        path.join(root, "latest-calls.json"),
        JSON.stringify(calls, null, 2),
      );
    }
    return response;
  };
  for (const q of guidanceSamples.filter(
    (q) => !process.argv[2] || process.argv[2].split(",").includes(q.id),
  )) {
    calls = [];
    let existing = report.cases[q.id];
    if (!existing) {
      const now = new Date().toISOString();
      const doc: DocumentJob = {
        id: randomUUID(),
        owner: "video-review",
        title: `Video mới · ${q.topic}`,
        subject:
          q.id === "english"
            ? "english"
            : q.id === "reading"
              ? "vietnamese"
              : "math",
        mode: "weekly",
        practiceCount: 5,
        pageRange: "",
        files: [
          {
            name: "review.pdf",
            mime: "application/pdf",
            size: 10,
            uploaded: true,
          },
        ],
        storage: "local",
        createdAt: now,
        updatedAt: now,
        status: "complete",
        message: "",
        totalPages: 1,
        selectedPages: [1],
        completedPages: [1],
        batches: [],
        model: "review",
        learning: {
          id: randomUUID(),
          status: "ready",
          count: 1,
          topics: [],
          createdAt: now,
          updatedAt: now,
          model: "review",
          message: "",
          parts: [
            {
              key: "review",
              kind: "original",
              sourceIds: [],
              count: 1,
              done: true,
              questions: [q],
              skipped: [],
            },
          ],
        },
      };
      await writeJob(doc);
      const run = await startLearningRun(doc.id, "video-review", {
        kind: "original",
        resume: false,
      });
      existing = { documentId: doc.id, runId: run.id };
      report.cases[q.id] = existing;
    }
    if (process.argv.includes("--recover") && existing.guidanceId) {
      const interrupted = await readGuidance(
        existing.documentId,
        existing.guidanceId,
      );
      if (interrupted && ["generating", "queued"].includes(interrupted.status))
        await failGuidance(
          existing.documentId,
          existing.guidanceId,
          interrupted.execution,
        );
    }
    let pending: [string, string, string] | undefined;
    let dispatches = 0;
    guidanceDispatcher.start = async (...args) => {
      pending = args;
      dispatches++;
    };
    console.log(`Generating ${q.id}…`);
    const started = performance.now();
    const requested = await requestGuidance(
      existing.documentId,
      existing.runId,
      "video-review",
      { questionId: q.id, retry: true },
    );
    if (pending) await generateGuidanceWorkflow(...pending);
    const saved = (await readGuidance(
      existing.documentId,
      requested.guidance.id,
    ))!;
    const elapsed = (performance.now() - started) / 1000;
    const cached = await requestGuidance(
      existing.documentId,
      existing.runId,
      "video-review",
      { questionId: q.id },
    );
    if (
      saved.status === "ready" &&
      (dispatches > 1 || cached.guidance.status !== "ready")
    )
      throw Error("Cache failure");
    for (const call of calls) {
      if (!call.id) continue;
      try {
        const r = await rawFetch(
          "https://openrouter.ai/api/v1/generation?id=" +
            encodeURIComponent(call.id),
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (r.ok) call.cost = (await r.json()).data?.total_cost ?? call.cost;
        else await r.body?.cancel();
      } catch {}
    }
    const priorCalls = existing.calls ?? [];
    report.cases[q.id] = {
      ...existing,
      topic: q.topic,
      status: saved.status,
      message: saved.message,
      guidanceId: saved.id,
      template: saved.motion?.template,
      duration: saved.motion?.duration,
      elapsedSeconds: pending ? elapsed : existing.elapsedSeconds,
      cached: !pending,
      sticker: saved.sticker,
      visualKinds: saved.motion?.visuals?.map((s) => s.kind),
      narration: saved.scripts,
      removedSilenceSeconds: saved.motionPrepared?.removedSilenceSeconds,
      url: `http://127.0.0.1:3106/luyen-tap/${existing.documentId}/${existing.runId}`,
      calls: [...priorCalls, ...calls],
    };
    const c = report.cases[q.id];
    c.totalKnownCost = c.calls.reduce(
      (n: number, x: any) => n + (x.cost ?? 0),
      0,
    );
    c.missingBilling = c.calls.filter((x: any) => x.cost === null).length;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({
        id: q.id,
        status: c.status,
        message: c.message,
        seconds: c.elapsedSeconds,
        duration: c.duration,
        kinds: c.visualKinds,
        cost: c.totalKnownCost,
        missingBilling: c.missingBilling,
        url: c.url,
      }),
    );
  }
  globalThis.fetch = rawFetch;
  console.log("Review report: " + reportPath);
  if (Object.values(report.cases).some((c: any) => c.status !== "ready"))
    process.exitCode = 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
