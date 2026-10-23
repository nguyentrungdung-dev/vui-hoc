import type { DocumentJob } from "../lib/documents";
import { listJobs, readJob } from "./store";
import { AppError } from "./validation";

// Uploaded documents are shared in this demo. Unfinished uploads stay with their creator.
export function canReadLibraryDocument(
  job: Pick<DocumentJob, "owner" | "files" | "revision">,
  viewer: string,
) {
  return (
    job.owner === viewer ||
    !!job.revision ||
    (job.files.length > 0 && job.files.every((file) => file.uploaded))
  );
}
export async function readLibraryJob(id: string, viewer: string) {
  const job = await readJob(id);
  if (!canReadLibraryDocument(job, viewer))
    throw new AppError("Tài liệu chưa tải xong.", 404);
  return job;
}
export async function listLibraryJobs(viewer: string) {
  return (await listJobs()).filter((job) =>
    canReadLibraryDocument(job, viewer),
  );
}
