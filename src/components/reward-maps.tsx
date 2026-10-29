"use client";
import {
  rewardItems,
  rewardMaps,
  type RewardItem,
  type RewardItemId,
  type RewardMapId,
} from "@/lib/rewards";
import { rewardItemLayout } from "@/lib/reward-layout";
import { rewardBackground, rewardSticker } from "@/lib/reward-stories";
import { MovableRewardItem, useRewardEditor } from "./reward-layout-editor";

export function RewardMapScene({
  mapId,
  placed,
  preview,
}: {
  mapId: RewardMapId;
  placed: RewardItemId[];
  preview?: RewardItem;
}) {
  const editor = useRewardEditor();
  const map = rewardMaps.find((entry) => entry.id === mapId)!;
  const visible = rewardItems
    .filter(
      (item) =>
        item.map === mapId &&
        (placed.includes(item.id) || item.id === preview?.id),
    )
    .sort((a, b) => placed.indexOf(a.id) - placed.indexOf(b.id));
  return (
    <svg
      viewBox="0 0 720 510"
      className={`study-room reward-map-scene scene-${mapId} ${editor.editing ? "is-editing" : ""}`}
      role={editor.editing ? "group" : "img"}
      aria-label={`${map.name}${visible.map((item) => `, ${item.name}`).join("")}${preview ? `. Đang xem thử ${preview.name}` : ""}`}
    >
      <image
        href={rewardBackground(mapId)}
        x="0"
        y="0"
        width="720"
        height="510"
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none"
      />
      {visible.map((item) => {
        const { x, y, width, height } = rewardItemLayout(item.id);
        return (
          <MovableRewardItem
            key={item.id}
            itemId={item.id}
            preview={item.id === preview?.id && !placed.includes(item.id)}
          >
            <image
              href={rewardSticker(item)}
              x={x - width / 2}
              y={y - height / 2}
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid meet"
              pointerEvents="none"
            />
          </MovableRewardItem>
        );
      })}
    </svg>
  );
}
