import type { RunView } from "./learning";

export type MotionTile = {
  text: string;
  slot: number;
  appearAt: number;
  highlightAt: number;
  moveTo: number | null;
};
export type MotionScene = { tiles: MotionTile[] };
export type GuidanceView = {
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
