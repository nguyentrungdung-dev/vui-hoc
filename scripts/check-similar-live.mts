// Real AI checks against saved source questions; no application history is added.
import env from "@next/env";
import { query, closeDatabase } from "../src/server/database";
import { buildSimilarQuestion } from "../src/server/similar";
import type { LearningRun, LearningQuestion } from "../src/lib/learning";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
env.loadEnvConfig(process.cwd());
const runId =
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ||
  "f2451496-885a-4386-ab4c-30c3b70fb0cf";
const folder = join(tmpdir(), "vuihoc-similar-live");
await mkdir(folder, { recursive: true });
try {
  const row = await query<{ data: LearningRun }>(
    "SELECT data FROM vuihoc_runs WHERE id=$1",
    [runId],
  );
  const run = row.rows[0]?.data;
  assert.ok(run);
  console.log(
    JSON.stringify(
      run.questions.map((q, i) => ({
        index: i + 1,
        prompt: q.prompt,
        fields: q.answerFields?.length || 0,
      })),
    ),
  );
  if (process.argv.includes("--inspect")) process.exitCode = 0;
  else {
    const selected = [
      run.questions[6],
      run.questions.find(
        (q, i) =>
          i > 7 &&
          q.grading === "self_review" &&
          /hỏi|bao nhiêu/iu.test(q.prompt),
      ),
    ];
    for (const [caseIndex, source] of selected.entries()) {
      if (caseIndex === 0 && process.argv.includes("--word-only")) continue;
      if (caseIndex === 1 && process.argv.includes("--arithmetic-only"))
        continue;
      assert.ok(source, "No written word problem source found");
      const generated: LearningQuestion[] = [];
      for (let i = 0; i < 5; i++) {
        const begin = Date.now();
        const q = await buildSimilarQuestion(
          source,
          "progressive",
          i,
          generated,
          process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-5.5",
        );
        assert.equal(
          q.answerFields?.length || 0,
          source.answerFields?.length || 0,
        );
        assert.equal(q.hints.length, 3);
        assert.ok(q.steps.length >= 2);
        assert.ok(q.rubric?.length);
        generated.push(q);
        console.log(
          `Case ${caseIndex + 1}, question ${i + 1}/5: ${Date.now() - begin}ms, ${q.answerFields?.length || 0} fields, reviewed.`,
        );
        await writeFile(
          join(folder, `case-${caseIndex + 1}.json`),
          JSON.stringify({ source, generated }, null, 2),
        );
      }
    }
    console.log(
      `Verified 5 four-part questions and 5 written word problems. Diagnostics: ${folder}`,
    );
  }
} finally {
  await closeDatabase();
}
