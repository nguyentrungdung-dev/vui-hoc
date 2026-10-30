import env from "@next/env";
import { readFileSync, writeFileSync } from "node:fs";
import { publicDocument, type DocumentJob } from "../src/lib/documents";
import { preparePack, buildPart } from "../src/server/generation";
import { questionPresentation } from "../src/lib/question-context";
async function main() {
  env.loadEnvConfig(process.cwd());
  const job = JSON.parse(
    readFileSync(".test-data/question-context-audit/source.json", "utf8"),
  ) as DocumentJob;
  const doc = publicDocument(job);
  const report = {
    count: doc.questions.length,
    bai4: doc.questions
      .filter((q) => q.label === "Bài 4")
      .map((q) => ({
        id: q.id,
        pages: q.sourcePages,
        fields: q.answerFields?.length,
        issues: q.issues,
      })),
  };
  console.log(JSON.stringify(report));
  if (!process.argv.includes("--live")) return;
  const clean = { ...job, learning: undefined };
  const pack = preparePack(clean, { count: 0, topics: [], scope: "original" });
  const selected = doc.questions.filter(
    (q) => q.label === "Bài 4" || /They.*my classmates/.test(q.prompt),
  );
  if (selected.length !== 2)
    throw new Error("Expected the exact two user-reported source tasks.");
  const part = {
    key: "original-context-check",
    kind: "original" as const,
    sourceIds: selected.map((q) => q.id),
    count: selected.length,
    done: false,
    questions: [],
    skipped: [],
  };
  const result = await buildPart(clean, pack, part);
  writeFileSync(
    ".test-data/question-context-audit/verified-part.json",
    JSON.stringify(result, null, 2),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      verified: result.questions.map((q) => ({
        id: q.id,
        grading: q.grading,
        pages: q.sourcePages,
        fields: q.answerFields?.length,
        rubric: q.rubric?.length,
      })),
      skipped: result.skipped,
    }),
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Audit failed");
  process.exitCode = 1;
});
