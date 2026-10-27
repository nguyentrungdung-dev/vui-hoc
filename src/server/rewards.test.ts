import { test, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  earnRewards,
  recordRewards,
  readRewards,
  changeRewards,
} from "./rewards";
import { emptyRewards } from "../lib/rewards";
import {
  emptyLearningAttempt,
  type LearningRun,
  type LearningQuestion,
} from "../lib/learning";
const dir = mkdtempSync(path.join(os.tmpdir(), "vuihoc-rewards-"));
process.env.VUIHOC_DATA_DIR = dir;
after(() => rm(dir, { recursive: true, force: true }));
function run(documentId = randomUUID()): LearningRun {
  const questions = ["a", "b", "c"].map(
    (id) => ({ id, grading: "choice" }) as LearningQuestion,
  );
  return {
    id: randomUUID(),
    documentId,
    packId: "pack",
    title: "Cộng trong phạm vi 100",
    kind: "practice",
    mode: "weekly",
    questions,
    attempts: Object.fromEntries(
      questions.map((q) => [
        q.id,
        {
          ...emptyLearningAttempt(),
          solved: true,
          tries: 1,
          firstCorrect: true,
        },
      ]),
    ),
    finished: true,
    index: 2,
    createdAt: "2026-10-27T03:00:00Z",
    updatedAt: "2026-10-27T03:00:00Z",
    eventIds: [],
  };
}
test("award completion once across retries, reordered questions and new run IDs", () => {
  const state = emptyRewards(),
    first = run();
  earnRewards(state, first, false);
  earnRewards(state, first, false);
  earnRewards(
    state,
    { ...first, id: randomUUID(), questions: [...first.questions].reverse() },
    false,
  );
  assert.equal(state.balance, 2);
  assert.equal(state.events.length, 1);
});
test("unfinished and early-ended lessons do not earn completion stars", () => {
  const state = emptyRewards(),
    first = run();
  earnRewards(state, { ...first, finished: false }, false);
  first.attempts.a.solved = false;
  earnRewards(state, first, false);
  assert.equal(state.balance, 0);
});
test("third distinct lesson adds a milestone; revision receives only its own 2 stars", () => {
  const state = emptyRewards();
  earnRewards(state, run(), false);
  earnRewards(state, run(), false);
  earnRewards(state, run(), true);
  assert.equal(state.balance, 8);
  assert.equal(state.events.length, 4);
  assert.match(state.events[2].message, /ôn tập/);
  assert.match(state.events[3].message, /3 bài/);
});
test("three corrected questions accumulate across lessons, exclude guided answers and never repeat", () => {
  const state = emptyRewards();
  const first = run();
  for (const a of Object.values(first.attempts))
    Object.assign(a, { tries: 2, firstCorrect: false, hintOpens: 1 });
  first.attempts.c.guided = true;
  earnRewards(state, first, false);
  assert.equal(state.balance, 2);
  assert.equal(state.corrected.length, 2);
  const second = run();
  Object.assign(second.attempts.a, { tries: 2, firstCorrect: false });
  earnRewards(state, second, false);
  assert.equal(state.balance, 5);
  earnRewards(state, { ...first, id: randomUUID() }, false);
  assert.equal(state.balance, 5);
});
test("concurrent purchases cannot overspend; repeat purchase is free; room persists and owners are isolated", async () => {
  const owner = "alice";
  await recordRewards(owner, run(), false);
  await recordRewards(owner, run(), false);
  const results = await Promise.allSettled([
    changeRewards(owner, { action: "buy", itemId: "pencils" }),
    changeRewards(owner, { action: "buy", itemId: "picture" }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const state = await readRewards(owner);
  const itemId = state.owned[0];
  const again = await changeRewards(owner, { action: "buy", itemId });
  assert.equal(again.balance, state.balance);
  assert.deepEqual(again.owned, [itemId]);
  assert.deepEqual(again.placed, [itemId]);
  assert.deepEqual(
    (await changeRewards(owner, { action: "store", itemId })).placed,
    [],
  );
  assert.deepEqual(
    (await changeRewards(owner, { action: "place", itemId })).placed,
    [itemId],
  );
  assert.equal((await readRewards("bob")).balance, 0);
  await assert.rejects(
    changeRewards("bob", { action: "place", itemId }),
    /đổi vật phẩm/,
  );
  await assert.rejects(
    changeRewards(owner, { action: "buy", itemId: "unknown" }),
    /Không tìm thấy/,
  );
  await assert.rejects(
    changeRewards(owner, { action: "buy", itemId: "desk", price: 0 }),
    /chưa hợp lệ/,
  );
});

test("maps are free, share one wallet, keep independent decorations, and survive switching back", async () => {
  const owner = "map-explorer";
  for (let n = 0; n < 6; n++) await recordRewards(owner, run(), false);
  await changeRewards(owner, { action: "buy", itemId: "pencils" });
  const before = (await readRewards(owner)).balance;
  const maps = [
    ["space", "star-lamp"],
    ["wildlife", "wildlife-flowers"],
    ["castle", "castle-mushroom"],
    ["robot", "robot-sign"],
  ];
  for (const [mapId, itemId] of maps) {
    const balance = (await readRewards(owner)).balance;
    const switched = await changeRewards(owner, { action: "map", mapId });
    assert.equal(switched.activeMap, mapId);
    assert.equal(switched.balance, balance);
    await changeRewards(owner, { action: "buy", itemId });
    assert.ok((await readRewards(owner)).placed.includes("pencils"));
  }
  const back = await changeRewards(owner, { action: "map", mapId: "study" });
  assert.equal(back.balance, before - 12);
  assert.equal(back.owned.length, 5);
  assert.equal(back.placed.length, 5);
  await assert.rejects(
    changeRewards(owner, { action: "place", itemId: "star-lamp" }),
    /Bản đồ đã thay đổi/,
  );
  await changeRewards(owner, { action: "store", itemId: "pencils" });
  const space = await changeRewards(owner, { action: "map", mapId: "space" });
  assert.ok(space.placed.includes("star-lamp"));
  assert.ok(!space.placed.includes("pencils"));
  assert.equal((await readRewards(owner)).activeMap, "space");
  await assert.rejects(
    changeRewards(owner, { action: "map", mapId: "unknown" }),
    /chưa hợp lệ/,
  );
  await assert.rejects(
    changeRewards(owner, { action: "map", mapId: "space", balance: 1000 }),
    /chưa hợp lệ/,
  );
});

test("legacy reward data opens the study map without losing stars or items; catalog ids and slots are unique", async () => {
  const { rewardView, rewardItems, rewardMaps } =
    await import("../lib/rewards");
  const legacy = emptyRewards();
  delete legacy.activeMap;
  legacy.balance = 7;
  legacy.owned = ["plant"];
  legacy.placed = ["plant"];
  const view = rewardView(legacy);
  assert.equal(view.activeMap, "study");
  assert.equal(view.balance, 7);
  assert.deepEqual(view.placed, ["plant"]);
  assert.equal(
    new Set(rewardItems.map((item) => item.id)).size,
    rewardItems.length,
  );
  for (const map of rewardMaps) {
    const items = rewardItems.filter((item) => item.map === map.id);
    assert.equal(items.length, 8);
    assert.equal(new Set(items.map((item) => item.slot)).size, 8);
    assert.deepEqual(
      items.map((item) => item.price),
      [3, 4, 5, 6, 8, 10, 12, 15],
    );
  }
});

test("drag positions persist without charging stars, stay within the map and survive storing and placing again", async () => {
  const owner = "layout-child";
  await recordRewards(owner, run(), false);
  await recordRewards(owner, run(), false);
  await changeRewards(owner, { action: "buy", itemId: "pencils" });
  const before = (await readRewards(owner)).balance;
  const moved = await changeRewards(owner, {
    action: "move",
    itemId: "pencils",
    position: { x: 0.65, y: 0.4 },
  });
  assert.deepEqual(moved.positions.pencils, { x: 0.65, y: 0.4 });
  assert.equal(moved.balance, before);
  assert.deepEqual((await readRewards(owner)).positions?.pencils, {
    x: 0.65,
    y: 0.4,
  });
  const edge = await changeRewards(owner, {
    action: "move",
    itemId: "pencils",
    position: { x: 0, y: 1 },
  });
  assert.ok(edge.positions.pencils.x > 0);
  assert.ok(edge.positions.pencils.y < 1);
  await changeRewards(owner, { action: "store", itemId: "pencils" });
  await assert.rejects(
    changeRewards(owner, {
      action: "move",
      itemId: "pencils",
      position: { x: 0.4, y: 0.4 },
    }),
    /đặt vật phẩm/,
  );
  const restored = await changeRewards(owner, {
    action: "place",
    itemId: "pencils",
  });
  assert.deepEqual(restored.positions.pencils, edge.positions.pencils);
  await assert.rejects(
    changeRewards(owner, {
      action: "move",
      itemId: "lamp",
      position: { x: 0.4, y: 0.4 },
    }),
    /đổi vật phẩm/,
  );
  for (const position of [
    { x: -1, y: 0.5 },
    { x: 1.1, y: 0.5 },
    { x: NaN, y: 0.5 },
    { x: 0.5, y: Infinity },
    { x: ".5", y: 0.5 },
  ]) {
    await assert.rejects(
      changeRewards(owner, { action: "move", itemId: "pencils", position }),
      /chưa hợp lệ/,
    );
  }
  assert.deepEqual((await readRewards("other-child")).positions, undefined);
});

test("map reset affects only the current map, legacy data defaults to original coordinates, and stale moves fail", async () => {
  const owner = "layout-maps";
  for (let i = 0; i < 4; i++) await recordRewards(owner, run(), false);
  await changeRewards(owner, { action: "buy", itemId: "pencils" });
  await changeRewards(owner, {
    action: "move",
    itemId: "pencils",
    position: { x: 0.6, y: 0.6 },
  });
  await changeRewards(owner, { action: "map", mapId: "space" });
  await changeRewards(owner, { action: "buy", itemId: "star-lamp" });
  await changeRewards(owner, {
    action: "move",
    itemId: "star-lamp",
    position: { x: 0.4, y: 0.4 },
  });
  await assert.rejects(
    changeRewards(owner, {
      action: "move",
      itemId: "pencils",
      position: { x: 0.7, y: 0.7 },
    }),
    /Bản đồ đã thay đổi/,
  );
  await assert.rejects(
    changeRewards(owner, { action: "reset_layout", mapId: "study" }),
    /Bản đồ đã thay đổi/,
  );
  const reset = await changeRewards(owner, {
    action: "reset_layout",
    mapId: "space",
  });
  assert.equal(reset.positions["star-lamp"], undefined);
  assert.deepEqual(reset.positions.pencils, { x: 0.6, y: 0.6 });
  assert.ok(reset.placed.includes("star-lamp"));
  const { rewardView } = await import("../lib/rewards");
  assert.deepEqual(rewardView(emptyRewards()).positions, {});
});
