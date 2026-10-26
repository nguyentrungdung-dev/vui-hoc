import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import type { DocumentJob, Subject } from "../lib/documents";
import type { LearningQuestion } from "../lib/learning";
import { sourceUrl } from "../lib/revision";
import { writeJob, readJob } from "./store";
import { createRevision, revisionCatalog } from "./revision";
import { processLearning } from "./generation";
import {
  startLearningRun,
  changeRun,
  learningHistory,
  readRun,
} from "./learning-runs";
import { dispatcher } from "./dispatch";
import { GET, POST } from "../app/api/documents/[[...parts]]/route";

const dir = mkdtempSync(path.join(os.tmpdir(), "vuihoc-revision-"));
process.env.VUIHOC_DATA_DIR = dir;
after(() => fs.rm(dir, { recursive: true, force: true }));
const token = "a".repeat(64);
const viewer = createHash("sha256").update(token).digest("hex");
function job(subject: Subject = "math", topic = "Cộng"): DocumentJob {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: `Tài liệu ${subject} ${randomUUID().slice(0, 4)}`,
    owner: "another-browser",
    subject,
    mode: "weekly",
    practiceCount: 25,
    pageRange: "",
    files: [
      { name: "source.pdf", size: 10, mime: "application/pdf", uploaded: true },
    ],
    createdAt: now,
    updatedAt: now,
    status: "complete",
    message: "",
    totalPages: 1,
    selectedPages: [1],
    completedPages: [1],
    model: "test",
    batches: [
      {
        key: "page-1",
        pages: [1],
        result: {
          summary: topic,
          pages: [
            {
              page: 1,
              text: `Kiến thức nguồn ${subject}: ${topic}. 2 + 3 = 5.`,
              topics: [topic],
              issues: [],
            },
          ],
          questions: [],
        },
      },
    ],
  };
}
function api(method: "GET" | "POST", parts: string[], body?: unknown) {
  const headers: Record<string, string> = {
    cookie: `vuihoc-library=${token}`,
    origin: "http://localhost:3100",
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  const req = new NextRequest(
    `http://localhost:3100/api/documents/${parts.join("/")}`,
    {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
  return (method === "GET" ? GET : POST)(req, {
    params: Promise.resolve({ parts }),
  });
}

test("Revision selection rejects mixed subjects, inaccessible uploads, invalid topics/count and recursive sets", async () => {
  const math = job();
  const english = job("english", "Cộng");
  const pending = job();
  pending.files[0].uploaded = false;
  await Promise.all([math, english, pending].map(writeJob));
  await assert.rejects(
    createRevision(viewer, {
      kind: "documents",
      subject: "math",
      documentIds: [math.id, english.id],
    }),
    /cùng một môn/,
  );
  await assert.rejects(
    createRevision(viewer, {
      kind: "documents",
      subject: "math",
      documentIds: [pending.id],
    }),
    /chưa tải xong/,
  );
  await assert.rejects(
    createRevision(viewer, {
      kind: "topics",
      subject: "vietnamese",
      topics: ["Cộng"],
    }),
    /nguồn đủ rõ/,
  );
  for (const count of [0, 4, 51, 5.5])
    await assert.rejects(
      createRevision(viewer, {
        kind: "documents",
        subject: "math",
        documentIds: [math.id],
        count,
      }),
    );
  await assert.rejects(
    createRevision(viewer, {
      kind: "documents",
      subject: "math",
      documentIds: Array.from({ length: 6 }, () => randomUUID()),
      count: 5,
    }),
    /ít nhất bằng số tài liệu/,
  );
  await assert.rejects(
    createRevision(viewer, {
      kind: "topics",
      subject: "math",
      topics: ["Không có trong nguồn"],
    }),
  );
  const created = await createRevision(viewer, {
    kind: "documents",
    subject: "math",
    documentIds: [math.id],
  });
  assert.equal(created.learning?.count, 25);
  assert.equal(created.learning?.parts.length, 5);
  assert.ok(created.learning?.parts.every((p) => p.kind === "practice"));
  await assert.rejects(
    startLearningRun(created.id, viewer, { kind: "practice" }),
    /kiểm tra xong/,
  );
  await assert.rejects(
    createRevision(viewer, {
      kind: "documents",
      subject: "math",
      documentIds: [created.id],
    }),
    /tài liệu gốc/,
  );
  const catalog = await revisionCatalog(viewer);
  assert.ok(
    !catalog.documents.some((d) => d.id === pending.id || d.id === created.id),
  );
  assert.ok(catalog.sets.some((s) => s.id === created.id));
});

test("Topic revision uses detected sources from one subject, retains original page identity, and excludes unclear text", async () => {
  const a = job("math", "Nhân");
  const b = job("math", "Nhân");
  b.files[0].mime = "image/jpeg";
  const foreign = job("english", "Nhân");
  const unclear = job("math", "Nhân");
  unclear.batches[0].result!.pages[0].issues = ["Chữ mờ"];
  await Promise.all([a, b, foreign, unclear].map(writeJob));
  const result = await createRevision(viewer, {
    kind: "topics",
    subject: "math",
    topics: ["Nhân"],
    count: 7,
  });
  assert.deepEqual(
    new Set(result.revision?.documentIds),
    new Set([a.id, b.id]),
  );
  assert.deepEqual(result.learning?.topics, ["Nhân"]);
  assert.deepEqual(
    result.revision?.sources.map((s) => s.page),
    [1, 2],
  );
  for (const s of result.revision!.sources) {
    assert.equal(s.sourcePage, 1);
    assert.equal(
      sourceUrl(s),
      `/api/documents/${s.documentId}/files/0${s.documentId === a.id ? "#page=1" : ""}`,
    );
  }
  assert.ok(
    result.batches.every((batch) => !JSON.stringify(batch).includes("english")),
  );
});

test("Revision API enqueues existing workflow, hides sets from source library, and rejects cross-origin creation", async () => {
  const source = job();
  await writeJob(source);
  const dispatch = mock.method(dispatcher, "start", async () => {});
  try {
    const response = await api("POST", ["revision"], {
      kind: "documents",
      subject: "math",
      documentIds: [source.id],
    });
    assert.equal(response.status, 201);
    const { id } = await response.json();
    assert.equal(dispatch.mock.calls.length, 1);
    assert.equal(dispatch.mock.calls[0].arguments[0], "learning");
    const set = await readJob(id);
    assert.equal(set.owner, viewer);
    const library = await (await api("GET", [])).json();
    assert.ok(!library.documents.some((d: { id: string }) => d.id === id));
    const catalog = await (await api("GET", ["revision"])).json();
    assert.ok(catalog.sets.some((s: { id: string }) => s.id === id));
    const req = new NextRequest(
      "http://localhost:3100/api/documents/revision",
      {
        method: "POST",
        headers: {
          origin: "https://other.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    assert.equal(
      (await POST(req, { params: Promise.resolve({ parts: ["revision"] }) }))
        .status,
      403,
    );
  } finally {
    dispatch.mock.restore();
  }
});

test("Generated revision questions keep grounding, hide answers, support hints/scoring and persist in shared history", async () => {
  const source = job("math", "Trừ");
  const second = job("math", "Trừ");
  for (let page = 2; page <= 12; page++)
    source.batches[0].result!.pages.push({
      page,
      text: `Phép trừ trang ${page}: 5 - 2 = 3.`,
      topics: ["Trừ"],
      issues: [],
    });
  await Promise.all([source, second].map(writeJob));
  const set = await createRevision(viewer, {
    kind: "documents",
    subject: "math",
    documentIds: [source.id, second.id],
    count: 7,
  });
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-only";
  let calls = 0;
  const seenSources = new Set<string>();
  const fetcher = mock.method(
    globalThis,
    "fetch",
    async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
      const body = JSON.parse(String(init?.body));
      const text = body.messages[1].content[0].text as string;
      calls++;
      let result;
      if (body.response_format.json_schema.name === "learning_content") {
        const payload = JSON.parse(text.split("\nNguồn: ")[1].split("\n")[0]);
        assert.equal(payload.subject, "Toán");
        assert.ok(payload.grounding.includes("Không mở rộng"));
        assert.ok(
          payload.provenance.every((s: { documentId: string }) =>
            [source.id, second.id].includes(s.documentId),
          ),
        );
        for (const s of payload.provenance) seenSources.add(s.documentId);
        result = {
          questions: payload.assignments.map(
            (a: { id: string; topic: string }, i: number): LearningQuestion => {
              const number = Number(a.id.split("-")[1]) + 10;
              return {
                id: a.id,
                sourceIds: [],
                sourcePages: [payload.targets[i % payload.targets.length].page],
                topic: a.topic,
                label: a.id,
                prompt: `${number} − 2 = ?`,
                passage: "",
                options: [
                  { label: "A", text: String(number - 2) },
                  { label: "B", text: String(number) },
                  { label: "C", text: String(number + 2) },
                ],
                hasFigure: false,
                figureDescription: "",
                advanced:
                  payload.assignments.length >= 5 &&
                  i === payload.assignments.length - 1,
                translation: "",
                grading: "choice",
                answer: "A",
                acceptedAnswers: [],
                hints: ["Bớt đi hai.", "Đếm lùi.", "Lùi thêm một bước."],
                steps: ["Bớt đi hai đơn vị.", `${number} - 2 = ${number - 2}.`],
                explanation: "Phép trừ là bớt đi.",
                englishSteps: [],
                checks: [{ expression: `${number}-2`, value: number - 2 }],
              };
            },
          ),
          skipped: [],
        };
      } else if (
        body.response_format.json_schema.name === "teaching_consistency"
      ) {
        const payload = JSON.parse(text);
        result = {
          reviews: payload.questions.map((q: { id: string }) => ({
            id: q.id,
            valid: true,
            reason: "",
          })),
        };
      } else {
        const payload = JSON.parse(text);
        assert.ok(payload.questions.every((q: object) => !("answer" in q)));
        result = {
          reviews: payload.questions.map((q: { id: string }) => ({
            id: q.id,
            valid: true,
            answer: "A",
            reason: "",
          })),
        };
      }
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(result) },
          },
        ],
      });
    },
  );
  try {
    await processLearning(set.id);
  } finally {
    fetcher.mock.restore();
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
  assert.equal(calls, 6);
  assert.deepEqual(seenSources, new Set([source.id, second.id]));
  assert.equal((await readJob(set.id)).learning?.status, "ready");
  const run = await startLearningRun(set.id, viewer, { kind: "practice" });
  assert.equal(run.questions.length, 7);
  assert.ok(!("answer" in run.questions[0]));
  await changeRun(set.id, run.id, viewer, {
    eventId: randomUUID(),
    action: "hint",
    questionId: run.questions[0].id,
  });
  const answered = await changeRun(set.id, run.id, viewer, {
    eventId: randomUUID(),
    action: "answer",
    questionId: run.questions[0].id,
    answer: "A",
  });
  assert.equal(answered.result.firstCorrect, 1);
  assert.equal(answered.result.hints, 1);
  assert.equal(answered.result.independent, 0);
  assert.equal(answered.questions[0].solution?.answer, "A");
  await changeRun(set.id, run.id, viewer, {
    eventId: randomUUID(),
    action: "finish",
  });
  assert.equal((await readRun(set.id, run.id, "other-browser")).finished, true);
  const history = await learningHistory("other-browser");
  assert.ok(
    history.some(
      (r) => r.id === run.id && r.finished && r.total === 7 && r.hints === 1,
    ),
  );
});
