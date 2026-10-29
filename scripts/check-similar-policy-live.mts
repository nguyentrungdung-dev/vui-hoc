// Read-only source lookup. Generated questions are saved to a local diagnostic folder only.
import env from "@next/env";
import pg from "pg";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSimilarQuestion } from "../src/server/similar";
import {
  similarDifficulties,
  type SimilarDifficulty,
} from "../src/lib/similar";
import type { LearningRun, LearningQuestion } from "../src/lib/learning";

env.loadEnvConfig(process.cwd());
const model = process.env.OPENROUTER_MODEL;
assert.equal(
  model,
  "anthropic/claude-haiku-5.5",
  "This check targets the configured Haiku 5.5 model",
);
const folder = join(tmpdir(), `vuihoc-similar-policy-${Date.now()}`);
await mkdir(folder, { recursive: true });
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 15000,
  query_timeout: 15000,
});
let choice: LearningQuestion,
  arithmetic: LearningQuestion,
  written: LearningQuestion;
try {
  await pool.query("BEGIN READ ONLY");
  const failed = await pool.query<{ data: LearningRun }>(
    "SELECT data FROM vuihoc_runs WHERE id=$1",
    ["880010c4-9a5b-46ca-97eb-4875916b4c66"],
  );
  choice = failed.rows[0]?.data.similar?.source!;
  const original = await pool.query<{ data: LearningRun }>(
    "SELECT data FROM vuihoc_runs WHERE id=$1",
    ["f2451496-885a-4386-ab4c-30c3b70fb0cf"],
  );
  const questions = original.rows[0]?.data.questions || [];
  arithmetic = questions.find(
    (q) => /đặt tính/iu.test(q.prompt) && q.answerFields?.length === 4,
  )!;
  written = questions.find(
    (q) =>
      q.grading === "self_review" &&
      /hỏi|bao nhiêu/iu.test(q.prompt) &&
      (q.answerFields?.length || 0) <= 1,
  )!;
  assert.ok(choice);
  assert.ok(arithmetic);
  assert.ok(written);
  await pool.query("COMMIT");
} finally {
  await pool.end();
}
const sets: {
  name: string;
  source: LearningQuestion;
  difficulty: SimilarDifficulty;
}[] = [
  ...similarDifficulties.map((d) => ({
    name: `choice-${d.value}`,
    source: choice,
    difficulty: d.value,
  })),
  {
    name: "arithmetic-progressive",
    source: arithmetic,
    difficulty: "progressive",
  },
  { name: "written-progressive", source: written, difficulty: "progressive" },
];
const filter = process.argv
  .find((arg) => arg.startsWith("--sets="))
  ?.slice(7)
  .split(",");
const selected = filter
  ? sets.filter((set) => filter.includes(set.name))
  : process.argv.includes("--quick")
    ? sets.slice(0, 1)
    : sets;
const results: unknown[] = [];
let cursor = 0;
async function worker() {
  while (cursor < selected.length) {
    const set = selected[cursor++];
    const generated: LearningQuestion[] = [];
    const timings: number[] = [];
    const begin = Date.now();
    let error: string | undefined;
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        const q = await buildSimilarQuestion(
          set.source,
          set.difficulty,
          i,
          generated,
          model!,
        );
        assert.equal(
          q.answerFields?.length || 0,
          set.source.answerFields?.length || 0,
        );
        assert.ok(q.generationApproval?.review.valid);
        generated.push(q);
        timings.push(Date.now() - start);
        console.log(
          JSON.stringify({
            set: set.name,
            index: i + 1,
            ms: timings.at(-1),
            attempts: q.generationApproval!.attempts,
            level: q.generationApproval!.level,
          }),
        );
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        console.log(JSON.stringify({ set: set.name, index: i + 1, error }));
        break;
      } finally {
        await writeFile(
          join(folder, `${set.name}.json`),
          JSON.stringify(
            { model, source: set.source, generated, timings, error },
            null,
            2,
          ),
        );
      }
    }
    results.push({
      set: set.name,
      count: generated.length,
      ms: Date.now() - begin,
      timings,
      error,
    });
  }
}
await Promise.all([worker(), worker()]);
await writeFile(
  join(folder, "summary.json"),
  JSON.stringify({ model, results }, null, 2),
);
console.log(JSON.stringify({ folder, results }, null, 2));
if (results.some((r) => (r as { count: number }).count !== 5))
  process.exitCode = 1;
