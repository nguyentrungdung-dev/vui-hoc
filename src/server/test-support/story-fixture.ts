import approved from "../guidance-motion/approved-45-38.json";
import type { StorySource, StoryLesson } from "../../lib/guidance";
export function fixtureStory(source: StorySource): StoryLesson {
  const sourceIndex = source.steps.findIndex((s) => s.trim()) + 2;
  const text = source.steps[sourceIndex - 2].slice(0, 100);
  return {
    title: "Cùng hiểu cách giải",
    segments: approved.segments.map((s, i) => ({
      heading: `Cùng xem bước ${i + 1}`,
      kind: "sequence",
      shape: "none",
      narration: s.narration,
      items: [
        {
          text,
          sourceIndex,
          cue: s.narration.split(/\s+/).slice(0, 3).join(" "),
        },
      ],
      coveredSteps: i === 0 ? source.steps.map((_, i) => i) : [],
      reaction: i === 5 ? "celebrate" : "think",
    })),
  };
}
export function fixtureWords(lesson: StoryLesson) {
  return lesson.segments.flatMap((s, i) =>
    s.narration.split(/\s+/).map((word, j, a) => ({
      word,
      start: (i * 50) / 6 + (j * 7.5) / a.length,
      end: (i * 50) / 6 + ((j + 1) * 7.5) / a.length,
    })),
  );
}
export function fixturePcm() {
  const pcm = Buffer.alloc(7.5 * 48000);
  for (let i = 0; i < pcm.length; i += 2)
    pcm.writeInt16LE(i % 4 ? 1200 : -1200, i);
  return pcm;
}

export function fixtureReply(name: string, source: StorySource) {
  const lesson = fixtureStory(source);
  if (name === "guidance_story_check") return { valid: true, issues: [] };
  if (name === "guidance_script")
    return Object.fromEntries(
      lesson.segments.map((s, i) => [`s${i + 1}`, s.narration]),
    );
  return {
    title: lesson.title,
    scenes: lesson.segments.map(({ narration, ...visual }, i) => ({
      sceneIndex: i,
      ...visual,
    })),
  };
}
