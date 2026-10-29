import type { RunView } from "./learning";

export type MotionTile = {
  text: string;
  slot: number;
  appearAt: number;
  highlightAt: number;
  moveTo: number | null;
};
export type MotionScene = { tiles: MotionTile[] };
export type MotionEvent = {
  action: string;
  phrase: string;
  screenText: string;
  time: number;
};
export type MotionLesson = {
  title: string;
  segments: {
    id: string;
    narration: string;
    learningGoal: string;
    cues: Omit<MotionEvent, "time">[];
  }[];
};
export type StorySource = {
  prompt: string;
  passage: string;
  steps: string[];
  explanation: string;
  answer: string;
  figureDescription: string;
  topic: string;
};
export type StoryVisual = {
  heading: string;
  kind: "equation" | "groups" | "compare" | "evidence" | "sequence" | "shape";
  shape: "none" | "triangle" | "rectangle" | "circle";
  items: string[];
  reaction: "hello" | "think" | "aha" | "check" | "celebrate";
};
export type StoryLesson = {
  title: string;
  segments: (Omit<StoryVisual, "items"> & {
    narration: string;
    items: { text: string; sourceIndex: number; cue: string }[];
    coveredSteps: number[];
  })[];
};
export type GuidanceMotion = {
  title?: string;
  visuals?: StoryVisual[];
  sticker?: { src: string; name: string };
  template: "carry-45-38" | "lesson-v3";
  duration: number;
  events: MotionEvent[];
  clips: { start: number; end: number; seconds: number; narration: string }[];
};
export type GuidanceView = {
  motion?: GuidanceMotion;
  id: string;
  status: "queued" | "generating" | "ready" | "failed";
  message: string;
  completed: number;
  total: number;
  prompt: string;
  segments: {
    text: string;
    scene: MotionScene | null;
    audioUrl: string | null;
  }[];
};
export type GuidanceResponse = { guidance: GuidanceView; run?: RunView };

// Timings are relative to the actual audio duration, never an estimated word count.
export function tileFrame(tile: MotionTile, progress: number) {
  const travel = Math.max(0, Math.min(1, (progress - 0.55) / 0.2));
  const from = { x: tile.slot % 3, y: Math.floor(tile.slot / 3) };
  const to =
    tile.moveTo === null
      ? from
      : { x: tile.moveTo % 3, y: Math.floor(tile.moveTo / 3) };
  return {
    visible: progress >= tile.appearAt,
    highlighted: progress >= tile.highlightAt,
    x: from.x + (to.x - from.x) * travel,
    y: from.y + (to.y - from.y) * travel,
  };
}
