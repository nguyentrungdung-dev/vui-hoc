// Read-only inspection of one user-reported document. No account/session data exported.
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { Pool } from "pg";
import { writeFile } from "node:fs/promises";
loadEnvConfig(process.cwd());
const id = process.argv[2];
if (!id || !process.env.DATABASE_URL)
  throw new Error("Document ID and database configuration required.");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
});
try {
  const { rows } = await pool.query(
    "SELECT data FROM vuihoc_documents WHERE id = $1",
    [id],
  );
  if (!rows.length) throw new Error("Document not found.");
  const j = rows[0].data;
  const data = j;
  await writeFile(
    ".test-data/question-context-audit/source.json",
    JSON.stringify(data, null, 2),
    { mode: 0o600 },
  );
  if (process.argv[3]) {
    const result = await pool.query(
      "SELECT data FROM vuihoc_runs WHERE id=$1 AND document_id=$2",
      [process.argv[3], id],
    );
    if (!result.rows.length) throw new Error("Run not found");
    await writeFile(
      ".test-data/question-context-audit/reported-run.json",
      JSON.stringify(result.rows[0].data, null, 2),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        run: process.argv[3],
        questions: result.rows[0].data.questions.length,
        attempts: Object.keys(result.rows[0].data.attempts).length,
      }),
    );
  }
  console.log(
    JSON.stringify({
      title: j.title,
      pages: j.selectedPages,
      batches: j.batches.map((b) => ({
        key: b.key,
        questions: b.result?.questions.length,
      })),
      originals: j.learning?.parts
        .filter((p) => p.kind === "original")
        .flatMap((p) => p.questions).length,
    }),
  );
} finally {
  await pool.end();
}
