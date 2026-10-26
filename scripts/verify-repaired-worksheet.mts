// Real PostgreSQL/store/run checks; every verification run is rolled back, never added to history.
import nextEnv from "@next/env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readJob } from "../src/server/store";
import { closeDatabase, databaseLock, query } from "../src/server/database";
import { startLearningRun, changeRun } from "../src/server/learning-runs";
nextEnv.loadEnvConfig(process.cwd());
const id = process.argv[2];
if (!id) throw Error("Pass a document id.");
class VerificationRollback extends Error {}
const checked: {
  label: string;
  answer: string;
  choices: number;
  hint: boolean;
  solution: boolean;
}[] = [];
try {
  const job = await readJob(id);
  const questions = job
    .learning!.parts.filter((p) => p.kind === "original")
    .flatMap((p) => p.questions)
    .filter((q) => q.grading === "choice");
  assert.ok(questions.length);
  try {
    await databaseLock(`verify-worksheet:${randomUUID()}`, async () => {
      for (const q of questions) {
        let run = await startLearningRun(id, job.owner, {
          kind: "original",
          resume: false,
          topic: q.topic,
        });
        const index = run.questions.findIndex((item) => item.id === q.id);
        assert.ok(index >= 0);
        if (index !== run.index)
          run = await changeRun(id, run.id, job.owner, {
            eventId: randomUUID(),
            action: "go",
            index,
          });
        run = await changeRun(id, run.id, job.owner, {
          eventId: randomUUID(),
          action: "hint",
          questionId: q.id,
        });
        assert.equal(run.questions[index].hint, q.hints[0]);
        for (const option of [...q.options].sort(
          (a, b) => Number(a.label === q.answer) - Number(b.label === q.answer),
        )) {
          run = await changeRun(id, run.id, job.owner, {
            eventId: randomUUID(),
            action: "answer",
            questionId: q.id,
            answer: option.label,
          });
          assert.equal(
            run.attempts[q.id].solved,
            option.label === q.answer,
            `${q.label}: ${option.label}`,
          );
        }
        assert.equal(run.questions[index].solution?.answer, q.answer);
        assert.deepEqual(run.questions[index].solution?.steps, q.steps);
        checked.push({
          label: q.label,
          answer: q.answer,
          choices: q.options.length,
          hint: true,
          solution: true,
        });
        console.log(
          `Verified persisted run: ${q.label}, answer=${q.answer}, ${q.options.length} choices, hint and solution agree.`,
        );
        const persisted = await query<{
          data: { questions: { options: { label: string; text: string }[] }[] };
        }>("SELECT data FROM vuihoc_runs WHERE id=$1", [run.id]);
        assert.equal(
          Object.keys(persisted.rows[0].data.questions[index].options[0])[0],
          "text",
        );
      }
      throw new VerificationRollback();
    });
  } catch (error) {
    if (!(error instanceof VerificationRollback)) throw error;
  }
  console.log(
    JSON.stringify(
      { documentId: id, checked, verificationHistoryRolledBack: true },
      null,
      2,
    ),
  );
} finally {
  await closeDatabase();
}
