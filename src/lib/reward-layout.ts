import { rewardItems } from "./rewards";
export type RewardPosition = { x: number; y: number };
export type RewardPositions = Record<string, RewardPosition>;
const study: Record<string, readonly [number, number, number, number]> = {
  pencils: [264, 282, 86, 100],
  picture: [345, 126, 102, 108],
  plant: [211, 273, 95, 110],
  books: [500, 163, 110, 90],
  lamp: [496, 268, 100, 120],
  bear: [594, 156, 110, 125],
  chair: [352, 409, 115, 140],
  desk: [360, 382, 245, 170],
};
const themed: Record<string, readonly (readonly [number, number, number])[]> = {
  space: [
    [570, 132, 46],
    [165, 387, 52],
    [174, 119, 58],
    [498, 369, 59],
    [265, 422, 66],
    [376, 366, 77],
    [347, 144, 66],
    [594, 300, 91],
  ],
  wildlife: [
    [153, 408, 48],
    [533, 180, 88],
    [128, 199, 53],
    [258, 431, 49],
    [323, 320, 69],
    [466, 316, 88],
    [565, 404, 93],
    [176, 333, 72],
  ],
  castle: [
    [133, 411, 43],
    [501, 431, 53],
    [225, 377, 76],
    [432, 215, 49],
    [365, 387, 76],
    [575, 393, 68],
    [136, 259, 65],
    [578, 226, 91],
  ],
  robot: [
    [122, 393, 47],
    [573, 398, 68],
    [132, 269, 58],
    [287, 389, 63],
    [391, 452, 67],
    [419, 158, 59],
    [467, 329, 70],
    [584, 215, 98],
  ],
};
export function rewardItemLayout(itemId: string) {
  const item = rewardItems.find((entry) => entry.id === itemId);
  if (!item) throw new Error("Unknown reward item");
  if (item.map === "study") {
    const [x, y, width, height] = study[itemId];
    return { x, y, width, height, size: 0, baseline: y };
  }
  const index = rewardItems
    .filter((entry) => entry.map === item.map)
    .findIndex((entry) => entry.id === itemId);
  const [x, baseline, size] = themed[item.map][index];
  return {
    x,
    y: baseline - size * 0.33,
    width: Math.max(90, size * 1.6),
    height: Math.max(100, size * 1.7),
    size,
    baseline,
  };
}
export function defaultRewardPosition(itemId: string): RewardPosition {
  const { x, y } = rewardItemLayout(itemId);
  return { x: x / 720, y: y / 510 };
}
export function clampRewardPosition(
  itemId: string,
  position: RewardPosition,
): RewardPosition {
  const { width, height } = rewardItemLayout(itemId);
  const paddingX = (width / 2 + 10) / 720,
    paddingY = (height / 2 + 10) / 510;
  return {
    x: Math.max(paddingX, Math.min(1 - paddingX, position.x)),
    y: Math.max(paddingY, Math.min(1 - paddingY, position.y)),
  };
}
