import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  publicDocument,
  subjects,
  type DocumentJob,
  type AnalysisPage,
} from "../lib/documents";
import type { RevisionCatalog, RevisionSource } from "../lib/revision";
import { AppError } from "./validation";
import { listLibraryJobs, readLibraryJob } from "./library";
import { modelName } from "./analysis";
import { preparePack } from "./generation";
import { writeJob } from "./store";

export const revisionRequest = z
  .object({
    kind: z.enum(["documents", "topics"]),
    subject: z.enum(["math", "english", "vietnamese", "self"]),
    documentIds: z.array(z.uuid()).max(20).default([]),
    topics: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
    count: z.number().int().min(5).max(50).default(25),
  })
  .strict();

// Only clear, detected text is used. Figure-dependent questions are excluded;
// new questions must be self-contained and are independently reviewed.
export function revisionPages(job: DocumentJob): AnalysisPage[] {
  if (job.revision || !["complete", "partial"].includes(job.status)) return [];
  const doc = publicDocument(job);
  return doc.pages
    .filter((p) => !p.issues.length)
    .flatMap((p) => {
      const questions = doc.questions.filter(
        (q) => q.sourcePages.includes(p.page) && !q.needsReview && !q.hasFigure,
      );
      const topics = [
        ...new Set([...p.topics, ...questions.map((q) => q.topic)]),
      ];
      const text =
        p.text.trim() ||
        questions
          .map((q) =>
            [
              q.passage,
              q.prompt,
              ...q.options.map((o) => `${o.label}. ${o.text}`),
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n");
      return text.trim() && topics.length ? [{ ...p, text, topics }] : [];
    });
}

export async function revisionCatalog(
  viewer: string,
): Promise<RevisionCatalog> {
  const jobs = await listLibraryJobs(viewer);
  return {
    documents: jobs
      .filter((j) => !j.revision)
      .flatMap((j) => {
        const pages = revisionPages(j);
        return pages.length
          ? [
              {
                id: j.id,
                title: j.title,
                subject: j.subject,
                topics: [...new Set(pages.flatMap((p) => p.topics))].sort(
                  (a, b) => a.localeCompare(b, "vi"),
                ),
                pageCount: pages.length,
                partial: j.status === "partial",
              },
            ]
          : [];
      }),
    sets: jobs
      .filter((j) => j.revision && j.learning)
      .map((j) => ({
        id: j.id,
        title: j.title,
        subject: j.subject,
        kind: j.revision!.kind,
        count: j.learning!.count,
        status: j.learning!.status,
        createdAt: j.createdAt,
      })),
  };
}

export async function createRevision(viewer: string, input: unknown) {
  const parsed = revisionRequest.safeParse(input);
  if (!parsed.success)
    throw new AppError("Chọn một môn, nguồn ôn tập và số câu từ 5 đến 50.");
  const config = parsed.data;
  if (
    config.kind === "documents" &&
    (!config.documentIds.length || config.topics.length)
  )
    throw new AppError("Chọn ít nhất một tài liệu để ôn bài.");
  if (
    config.kind === "topics" &&
    (!config.topics.length || config.documentIds.length)
  )
    throw new AppError("Chọn ít nhất một đề tài để ôn tổng hợp.");
  const topics = [...new Set(config.topics)];
  if (
    config.kind === "documents" &&
    new Set(config.documentIds).size > config.count
  )
    throw new AppError(
      "Số câu cần ít nhất bằng số tài liệu đã chọn để mỗi tài liệu đều có câu ôn.",
    );
  if (topics.length > config.count)
    throw new AppError(
      "Số câu cần ít nhất bằng số đề tài đã chọn để ôn đủ từng đề tài.",
    );
  const jobs =
    config.kind === "documents"
      ? await Promise.all(
          [...new Set(config.documentIds)].map((id) =>
            readLibraryJob(id, viewer),
          ),
        )
      : (await listLibraryJobs(viewer)).filter(
          (j) =>
            j.subject === config.subject &&
            !j.revision &&
            revisionPages(j).some((p) =>
              p.topics.some((t) => topics.includes(t)),
            ),
        );
  if (jobs.some((j) => j.subject !== config.subject || j.revision))
    throw new AppError(
      "Mỗi bộ luyện tập chỉ dùng tài liệu gốc của cùng một môn.",
    );
  const pages: AnalysisPage[] = [];
  const sources: RevisionSource[] = [];
  const usedJobs: DocumentJob[] = [];
  for (const job of jobs) {
    const eligible = revisionPages(job).filter(
      (p) =>
        config.kind === "documents" || p.topics.some((t) => topics.includes(t)),
    );
    if (!eligible.length) {
      if (config.kind === "documents")
        throw new AppError(
          `Tài liệu “${job.title}” chưa có nội dung nhận diện đủ rõ để ôn.`,
        );
      continue;
    }
    usedJobs.push(job);
    for (const original of eligible) {
      const page = pages.length + 1;
      pages.push({
        ...original,
        page,
        topics:
          config.kind === "topics"
            ? original.topics.filter((t) => topics.includes(t))
            : original.topics,
      });
      sources.push({
        page,
        documentId: job.id,
        title: job.title,
        sourcePage: original.page,
        fileIndex:
          job.files[0]?.mime === "application/pdf" ? 0 : original.page - 1,
        pdf: job.files[0]?.mime === "application/pdf",
      });
    }
  }
  const available = [...new Set(pages.flatMap((p) => p.topics))];
  if (!pages.length || topics.some((t) => !available.includes(t)))
    throw new AppError(
      "Đề tài đã chọn chưa có nội dung nguồn đủ rõ trong môn này.",
    );
  const now = new Date().toISOString();
  const title = `${config.kind === "documents" ? "Ôn bài" : "Ôn tổng hợp"} · ${subjects[config.subject].name}`;
  const job: DocumentJob = {
    id: randomUUID(),
    owner: viewer,
    title,
    subject: config.subject,
    mode: usedJobs.every((j) => j.mode === "timo") ? "timo" : "weekly",
    practiceCount: config.count,
    pageRange: "",
    files: [],
    createdAt: now,
    updatedAt: now,
    status: "complete",
    message: "Đã chọn nội dung từ tài liệu nguồn.",
    totalPages: pages.length,
    selectedPages: pages.map((p) => p.page),
    completedPages: pages.map((p) => p.page),
    batches: [
      {
        key: "revision",
        pages: pages.map((p) => p.page),
        result: { summary: title, pages, questions: [] },
      },
    ],
    model: modelName(),
    revision: {
      kind: config.kind,
      documentIds: usedJobs.map((j) => j.id),
      sources,
    },
  };
  job.learning = preparePack(job, {
    count: config.count,
    topics: config.kind === "topics" ? topics : available,
  });
  job.learningExecution = randomUUID();
  await writeJob(job);
  return job;
}
