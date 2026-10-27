// Real AI + PostgreSQL persistence checks. Test writes always roll back.
import env from "@next/env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assessWrittenAnswer } from "../src/server/answer-grading";
import { databaseLock, query, closeDatabase } from "../src/server/database";
import { applyRunAction } from "../src/server/learning-runs";
import { learningResult, runView, type LearningRun } from "../src/lib/learning";
env.loadEnvConfig(process.cwd());
const runId = process.argv[2] || "f2451496-885a-4386-ab4c-30c3b70fb0cf";
class Rollback extends Error {}
try {
  const row = await query<{ data: LearningRun }>(
    "SELECT data FROM vuihoc_runs WHERE id=$1",
    [runId],
  );
  const source = row.rows[0]?.data;
  assert.ok(source);
  const reports = [];
  for (const index of [6, 7]) {
    const q = source.questions[index],
      answer = source.attempts[q.id]?.last;
    assert.ok(answer);
    assert.equal(q.grading, "self_review");
    console.log(
      `Checking question ${index + 1} through two real AI reviews...`,
    );
    const assessment = await assessWrittenAnswer(q, answer);
    reports.push({ question: index + 1, answer, assessment });
    assert.equal(
      assessment.points,
      assessment.maxPoints,
      JSON.stringify(assessment),
    );
    assert.equal(
      assessment.parts
        .filter((p) => p.kind === "result")
        .every((p) => p.status === "graded"),
      true,
    );
    assert.equal(
      assessment.parts
        .filter((p) => p.kind === "method")
        .every((p) => p.status === "graded" && p.points === 0),
      true,
    );
    const testRun = structuredClone(source);
    testRun.id = randomUUID();
    testRun.index = index;
    testRun.finished = false;
    testRun.attempts = {};
    testRun.eventIds = [];
    applyRunAction(
      testRun,
      { eventId: randomUUID(), action: "answer", questionId: q.id, answer },
      Date.now(),
      assessment,
    );
    assert.equal(testRun.attempts[q.id].firstCredit, 1);
    assert.equal(testRun.attempts[q.id].solved, true);
    assert.equal(learningResult({ ...testRun, questions: [q] }).score, 10);
    try {
      await databaseLock(`verify-written:${testRun.id}`, async () => {
        await query(
          "INSERT INTO vuihoc_runs(id,document_id,data) VALUES($1,$2,$3::jsonb)",
          [testRun.id, source.documentId, JSON.stringify(testRun)],
        );
        const persisted = await query<{ data: LearningRun }>(
          "SELECT data FROM vuihoc_runs WHERE id=$1",
          [testRun.id],
        );
        const a = persisted.rows[0].data.attempts[q.id];
        assert.deepEqual(
          a.assessment?.audit,
          JSON.parse(JSON.stringify(assessment.audit)),
        );
        assert.equal(a.assessmentHistory?.length, 1);
        assert.equal(
          "audit" in runView(persisted.rows[0].data).attempts[q.id].assessment!,
          false,
        );
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
    const check = await query("SELECT id FROM vuihoc_runs WHERE id=$1", [
      testRun.id,
    ]);
    assert.equal(check.rowCount, 0);
    console.log(
      `Question ${index + 1}: result ${assessment.points}/${assessment.maxPoints}; method 0; persistence verified, test history rolled back.`,
    );
  }
  const path = join(tmpdir(), `vuihoc-written-verification-${Date.now()}.json`);
  await writeFile(path, JSON.stringify({ runId, reports }, null, 2));
  console.log(`Diagnostics: ${path}`);
} finally {
  await closeDatabase();
}
