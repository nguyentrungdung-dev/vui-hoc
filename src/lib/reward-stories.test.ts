import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";
import { rewardMaps, rewardItems } from "./rewards";
import {
  rewardStories,
  rewardSticker,
  rewardBackground,
  rewardStoryStage,
} from "./reward-stories";

test("every chapter has an original background and eight distinct transparent sticker assets", async () => {
  const paths = new Set<string>();
  for (const map of rewardMaps) {
    const story = rewardStories[map.id];
    assert.ok(story.paragraphs.length >= 3);
    assert.ok(
      rewardItems.some(
        (item) => item.id === story.guideItem && item.map === map.id,
      ),
    );
    const background = await sharp(
      path.join(process.cwd(), "public", rewardBackground(map.id)),
    ).metadata();
    assert.equal(background.width, 1200);
    assert.equal(background.height, 850);
    for (const item of rewardItems.filter((item) => item.map === map.id)) {
      const asset = rewardSticker(item);
      assert.ok(!paths.has(asset));
      paths.add(asset);
      const image = sharp(path.join(process.cwd(), "public", asset));
      assert.equal((await image.metadata()).hasAlpha, true);
      const { channels } = await image.stats();
      assert.equal(channels[3].min, 0);
      assert.ok(channels[3].max > 200);
    }
  }
  assert.equal(paths.size, 40);
});

test("story pages follow collected items and remain available after the collection is complete", () => {
  assert.deepEqual(
    [0, 1, 3, 4, 7, 8, 9].map(rewardStoryStage),
    [0, 1, 1, 2, 2, 3, 3],
  );
});
