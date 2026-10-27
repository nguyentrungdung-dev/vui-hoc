import { test } from "node:test";
import assert from "node:assert/strict";
import { rewardItems } from "./rewards";
import {
  clampRewardPosition,
  defaultRewardPosition,
  rewardItemLayout,
} from "./reward-layout";

test("all forty items have valid bounds and stay fully inside the scene at every edge", () => {
  for (const item of rewardItems) {
    const layout = rewardItemLayout(item.id);
    const initial = defaultRewardPosition(item.id);
    assert.ok(initial.x > 0 && initial.x < 1 && initial.y > 0 && initial.y < 1);
    for (const position of [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
    ]) {
      const bounded = clampRewardPosition(item.id, position);
      assert.ok(bounded.x * 720 - layout.width / 2 >= 9.999);
      assert.ok(bounded.x * 720 + layout.width / 2 <= 710.001);
      assert.ok(bounded.y * 510 - layout.height / 2 >= 9.999);
      assert.ok(bounded.y * 510 + layout.height / 2 <= 500.001);
    }
  }
});
