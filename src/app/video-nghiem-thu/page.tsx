import { notFound } from "next/navigation";
import { promises as fs } from "node:fs";
import path from "node:path";
import { readGuidance } from "@/server/guidance-store";
import { guidanceView } from "@/server/guidance";
import { VideoReview } from "@/components/video-review";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  const file = path.resolve(".test-data/video-review-20261029/review.json");
  const report = JSON.parse(
    await fs.readFile(file, "utf8").catch(() => '{"cases":{}}'),
  );
  const cases = await Promise.all(
    Object.entries(
      report.cases as Record<
        string,
        {
          documentId: string;
          runId: string;
          guidanceId: string;
          topic: string;
          elapsedSeconds: number;
        }
      >,
    ).map(async ([id, c]) => {
      const job = await readGuidance(c.documentId, c.guidanceId);
      if (!job || job.status !== "ready") return null;
      return {
        id,
        topic: c.topic,
        seconds: c.elapsedSeconds,
        guidance: guidanceView(job, c.runId),
      };
    }),
  );
  return (
    <VideoReview
      cases={cases.filter((c) => c !== null)}
      total={Object.keys(report.cases).length}
    />
  );
}
