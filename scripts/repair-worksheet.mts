// Targeted repair for the option-binding regression. `check` never changes application data.
// `apply` installs only the checked candidate, fences concurrent edits, and repairs unfinished attempts.
import nextEnv from "@next/env";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { readJob, updateJob, lock } from "../src/server/store";
import { query, closeDatabase } from "../src/server/database";
import { readSourceFile } from "../src/server/source-files";
import { renderPdfPage, cropPage } from "../src/server/page-images";
import { locateQuestionFigures } from "../src/server/figure-localization";
import { buildPart } from "../src/server/generation";
import { sameSourceOptions } from "../src/server/learning-validation";
import { publicDocument, type DocumentJob } from "../src/lib/documents";
import {
  isCorrect,
  runView,
  type LearningQuestion,
  type LearningRun,
} from "../src/lib/learning";
import { applyRunAction } from "../src/server/learning-runs";
nextEnv.loadEnvConfig(process.cwd());
const [id, mode = "check"] = process.argv.slice(2);
if (!id || !["check", "apply", "notices"].includes(mode))
  throw Error(
    "Usage: node --import tsx scripts/repair-worksheet.mts <document-id> check|apply|notices",
  );
const directory = join("/tmp", `vuihoc-repair-${id}`);
await mkdir(directory, { recursive: true, mode: 0o700 });
const regression = (q: LearningQuestion) =>
  q.grading === "ungraded" &&
  /Nhãn\/nội dung lựa chọn đã bị thay đổi/.test(q.ungradableReason || "");
function checkGrading(job: DocumentJob, repaired: LearningQuestion[]) {
  const sources = publicDocument(job).questions;
  for (const q of repaired) {
    assert.equal(q.grading, "choice", `${q.label}: not ready to grade`);
    assert.equal(q.hints.length, 3);
    assert.ok(q.steps.length >= 2);
    assert.equal(
      sameSourceOptions(q.options, sources.find((s) => s.id === q.id)!.options),
      true,
    );
    for (const option of q.options) {
      const run: LearningRun = {
        id: randomUUID(),
        documentId: job.id,
        title: job.title,
        packId: job.learning!.id,
        mode: job.mode,
        kind: "original",
        questions: [q],
        attempts: {},
        index: 0,
        finished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        eventIds: [],
      };
      applyRunAction(run, {
        eventId: randomUUID(),
        action: "hint",
        questionId: q.id,
      });
      assert.equal(runView(run).questions[0].hint, q.hints[0]);
      applyRunAction(run, {
        eventId: randomUUID(),
        action: "answer",
        questionId: q.id,
        answer: option.label,
      });
      assert.equal(run.attempts[q.id].solved, option.label === q.answer);
      if (option.label === q.answer)
        assert.equal(runView(run).questions[0].solution?.answer, q.answer);
    }
  }
}
try {
  if (mode === "check") {
    const before = await readJob(id);
    assert.ok(
      before.learning &&
        !["queued", "generating"].includes(before.learning.status),
    );
    const failed = before.learning.parts
      .flatMap((p) => p.questions)
      .filter(regression);
    assert.ok(failed.length, "No questions affected by this regression.");
    await writeFile(
      join(directory, "before.json"),
      JSON.stringify(before, null, 2),
      { mode: 0o600 },
    );
    const working = structuredClone(before),
      source = await readSourceFile(working, 0);
    const pages = new Map<number, Buffer>();
    for (const page of new Set(
      publicDocument(working)
        .questions.filter((q) => q.hasFigure)
        .flatMap((q) => q.sourcePages),
    )) {
      const png = await renderPdfPage(source, page);
      pages.set(page, png);
      await writeFile(join(directory, `page-${page}.png`), png);
    }
    console.log("Locating and independently checking original figure crops…");
    for (const batch of working.batches)
      if (batch.result) await locateQuestionFigures(batch.result, pages);
    const figures = publicDocument(working).questions.filter(
      (q) => q.hasFigure,
    );
    for (const q of figures) {
      assert.ok(
        q.figureRegions?.length && !q.figureIssue,
        `${q.label}: figure not isolated`,
      );
      for (const [i, r] of q.figureRegions.entries())
        await writeFile(
          join(directory, `figure-${q.id}-${i}.png`),
          await cropPage(pages.get(r.page)!, r),
        );
    }
    const repaired: LearningQuestion[] = [];
    for (let i = 0; i < failed.length; i += 5) {
      const ids = failed.slice(i, i + 5).map((q) => q.id);
      console.log(
        `Rebuilding ${ids.length} affected questions from the persisted source…`,
      );
      const result = await buildPart(working, working.learning!, {
        key: `repair-${i}`,
        kind: "original",
        sourceIds: ids,
        count: ids.length,
        done: false,
        questions: [],
        skipped: [],
      });
      assert.equal(result.questions.length, ids.length);
      repaired.push(...result.questions);
    }
    checkGrading(working, repaired);
    // The photographed worksheet has six choices with independently verifiable results.
    if (id === "8eb5965d-ad73-43f8-be64-1171daddb9cb") {
      const expected: Record<string, string> = {
        "Câu 1": "B",
        "Câu 2": "C",
        "Câu 3": "B",
        "Câu 4": "C",
        "Câu 5": "B",
        "Câu 6": "C",
      };
      for (const q of repaired)
        assert.equal(
          q.answer,
          expected[q.label],
          `${q.label}: disagrees with source mathematics`,
        );
    }
    const map = new Map(repaired.map((q) => [q.id, q]));
    working.learning!.parts = working.learning!.parts.map((p) => ({
      ...p,
      questions: p.questions.map((q) => map.get(q.id) || q),
    }));
    working.learning!.message =
      "Bài gốc, đáp án và gợi ý đã được kiểm tra. Hình minh họa được tách riêng từ đề gốc.";
    working.learning!.updatedAt = new Date().toISOString();
    // Exercise PostgreSQL JSONB itself, not a JavaScript approximation of key order.
    const roundtrip = await query<{ value: DocumentJob }>(
      "SELECT $1::jsonb AS value",
      [JSON.stringify(working)],
    );
    const persisted = roundtrip.rows[0].value;
    checkGrading(
      persisted,
      persisted
        .learning!.parts.flatMap((p) => p.questions)
        .filter((q) => map.has(q.id)),
    );
    await writeFile(
      join(directory, "candidate.json"),
      JSON.stringify(persisted, null, 2),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify(
        {
          checked: repaired.map((q) => ({
            id: q.id,
            label: q.label,
            answer: q.answer,
            grading: q.grading,
            hints: q.hints.length,
          })),
          figureCrops: figures.map((q) => ({
            id: q.id,
            regions: q.figureRegions,
          })),
          jsonbRoundtrip: true,
          directory,
        },
        null,
        2,
      ),
    );
  } else if (mode === "notices") {
    const stale =
      "Hình không cắt riêng, hiển thị cả trang; cần đếm lại trên hình gốc";
    const job = await readJob(id);
    await writeFile(
      join(directory, "before-notice-cleanup.json"),
      JSON.stringify(job),
      { mode: 0o600 },
    );
    const sources = publicDocument(job).questions.filter(
      (q) =>
        q.figureRegions?.length && !q.figureIssue && q.issues.includes(stale),
    );
    const ids = new Set(sources.map((q) => q.id));
    assert.ok(ids.size, "No obsolete full-page notices with verified crops.");
    await updateJob(id, (j) => {
      assert.equal(j.updatedAt, job.updatedAt);
      for (const b of j.batches)
        for (const q of b.result?.questions || []) {
          if (
            q.figureRegions?.length &&
            !q.figureIssue &&
            q.issues.includes(stale)
          ) {
            q.issues = q.issues.filter((issue) => issue !== stale);
            if (!q.issues.length) q.needsReview = false;
          }
        }
      for (const q of j.learning!.parts.flatMap((p) => p.questions))
        if (ids.has(q.id)) q.warnings = q.warnings?.filter((w) => w !== stale);
    });
    const runs = await query<{ id: string }>(
      "SELECT id FROM vuihoc_runs WHERE document_id=$1 AND (data->>'finished')::boolean=false",
      [id],
    );
    for (const row of runs.rows)
      await lock(`run:${id}:${row.id}`, async () => {
        const result = await query<{ data: LearningRun }>(
          "SELECT data FROM vuihoc_runs WHERE id=$1 AND document_id=$2",
          [row.id, id],
        );
        const run = result.rows[0].data;
        if (run.finished) return;
        await writeFile(
          join(directory, `run-before-notice-${run.id}.json`),
          JSON.stringify(run),
          { mode: 0o600 },
        );
        for (const q of run.questions)
          if (ids.has(q.id))
            q.warnings = q.warnings?.filter((w) => w !== stale);
        run.updatedAt = new Date().toISOString();
        await query(
          "UPDATE vuihoc_runs SET data=$1::jsonb,updated_at=now() WHERE id=$2 AND document_id=$3",
          [JSON.stringify(run), run.id, id],
        );
      });
    console.log(
      JSON.stringify({
        obsoleteNoticesRemoved: ids.size,
        activeRuns: runs.rows.length,
      }),
    );
  } else {
    const before = JSON.parse(
      await readFile(join(directory, "before.json"), "utf8"),
    ) as DocumentJob;
    const candidate = JSON.parse(
      await readFile(join(directory, "candidate.json"), "utf8"),
    ) as DocumentJob;
    const ids = new Set(
      before
        .learning!.parts.flatMap((p) => p.questions)
        .filter(regression)
        .map((q) => q.id),
    );
    const repaired = candidate
      .learning!.parts.flatMap((p) => p.questions)
      .filter((q) => ids.has(q.id));
    checkGrading(candidate, repaired);
    await updateJob(id, (j) => {
      assert.equal(
        j.updatedAt,
        before.updatedAt,
        "Document changed since validation; inspect again instead of overwriting.",
      );
      assert.equal(j.learning?.id, before.learning?.id);
      j.batches = candidate.batches;
      j.learning = candidate.learning;
    });
    const latest = await readJob(id);
    checkGrading(
      latest,
      latest
        .learning!.parts.flatMap((p) => p.questions)
        .filter((q) => ids.has(q.id)),
    );
    const map = new Map(repaired.map((q) => [q.id, q]));
    const runs = await query<{ id: string; data: LearningRun }>(
      "SELECT id,data FROM vuihoc_runs WHERE document_id=$1 AND (data->>'finished')::boolean=false",
      [id],
    );
    let repairedRuns = 0;
    for (const row of runs.rows)
      await lock(`run:${id}:${row.id}`, async () => {
        const current = await query<{ data: LearningRun }>(
          "SELECT data FROM vuihoc_runs WHERE id=$1 AND document_id=$2",
          [row.id, id],
        );
        const run = current.rows[0].data;
        if (run.finished) return;
        let changed = false;
        const original = JSON.stringify(run);
        run.questions = run.questions.map((q) => {
          const fixed = map.get(q.id);
          if (!fixed || !regression(q)) return q;
          changed = true;
          const a = run.attempts[q.id];
          if (a) {
            delete a.assessment;
            if (a.first !== undefined) {
              a.firstCorrect = !a.guided && isCorrect(fixed, a.first);
              a.firstCredit = a.firstCorrect ? 1 : 0;
            }
            a.solved = isCorrect(fixed, a.last || "");
          }
          return fixed;
        });
        if (changed) {
          await writeFile(
            join(directory, `run-before-${run.id}.json`),
            original,
            { mode: 0o600 },
          );
          run.updatedAt = new Date().toISOString();
          await query(
            "UPDATE vuihoc_runs SET data=$1::jsonb,updated_at=now() WHERE id=$2 AND document_id=$3",
            [JSON.stringify(run), run.id, id],
          );
          repairedRuns++;
        }
      });
    const checked = await readJob(id);
    assert.equal(
      checked.learning!.parts.flatMap((p) => p.questions).filter(regression)
        .length,
      0,
    );
    console.log(
      JSON.stringify({
        applied: true,
        documentId: id,
        repairedQuestions: repaired.length,
        repairedRuns,
        backups: directory,
      }),
    );
  }
} finally {
  await closeDatabase();
}
