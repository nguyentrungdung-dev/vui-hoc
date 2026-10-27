import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  emptyRewards,
  rewardItems,
  rewardMaps,
  type RewardMapId,
  rewardView,
  type RewardState,
} from "../lib/rewards";
import type { LearningRun } from "../lib/learning";
import { dataRoot, lock } from "./store";
import { databaseEnabled, query } from "./database";
import { clampRewardPosition } from "../lib/reward-layout";
import { AppError } from "./validation";

function rewardPath(owner: string) {
  return path.join(
    dataRoot(),
    "rewards",
    `${createHash("sha256").update(owner).digest("hex")}.json`,
  );
}
export async function readRewards(owner: string): Promise<RewardState> {
  if (databaseEnabled()) {
    const result = await query<{ data: RewardState }>(
      "SELECT data FROM vuihoc_rewards WHERE owner=$1",
      [owner],
    );
    return result.rows[0]?.data ?? emptyRewards();
  }
  try {
    return JSON.parse(await fs.readFile(rewardPath(owner), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return emptyRewards();
    throw error;
  }
}
async function saveRewards(owner: string, state: RewardState) {
  if (databaseEnabled()) {
    await query(
      "INSERT INTO vuihoc_rewards (owner, data) VALUES ($1, $2::jsonb) ON CONFLICT (owner) DO UPDATE SET data=EXCLUDED.data",
      [owner, JSON.stringify(state)],
    );
    return;
  }
  const target = rewardPath(owner);
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(state), { mode: 0o600 });
  await fs.rename(temp, target);
}
// Awards use verified server attempts; a new run ID cannot earn the same goal twice.
export function earnRewards(
  state: RewardState,
  run: LearningRun,
  revision: boolean,
) {
  if (!run.finished || !run.questions.length) return;
  const complete = run.questions.every((q) => {
    const a = run.attempts[q.id];
    return a && (a.solved || (q.grading === "ungraded" && a.tries > 0));
  });
  if (!complete) return;
  const add = (id: string, stars: number, message: string) => {
    if (state.events.some((e) => e.id === id)) return;
    state.balance += stars;
    state.events.push({
      id,
      runId: run.id,
      stars,
      message,
      date: run.updatedAt,
    });
  };
  const key = createHash("sha256")
    .update(
      JSON.stringify([
        run.documentId,
        [...run.questions.map((q) => q.id)].sort(),
      ]),
    )
    .digest("hex");
  if (!state.completed.includes(key)) {
    state.completed.push(key);
    add(
      `lesson:${key}`,
      2,
      `${revision ? "Con đã hoàn thành lượt ôn tập" : "Con đã hoàn thành bài"} ${run.title}!`,
    );
    if (state.completed.length % 3 === 0)
      add(
        `stage:${state.completed.length / 3}`,
        2,
        "Con đã hoàn thành chặng 3 bài học khác nhau!",
      );
  }
  const before = Math.floor(state.corrected.length / 3);
  for (const q of run.questions) {
    const a = run.attempts[q.id];
    const id = `${run.documentId}:${q.id}`;
    if (
      q.grading !== "ungraded" &&
      a?.solved &&
      a.firstCorrect === false &&
      a.tries > 1 &&
      !a.guided &&
      !state.corrected.includes(id)
    )
      state.corrected.push(id);
  }
  const after = Math.floor(state.corrected.length / 3);
  for (let n = before + 1; n <= after; n++)
    add(`correction:${n}`, 1, "Con đã tự sửa đúng 3 câu từng làm sai!");
}
export async function recordRewards(
  owner: string,
  run: LearningRun,
  revision: boolean,
) {
  return lock(`rewards:${owner}`, async () => {
    const state = await readRewards(owner);
    earnRewards(state, run, revision);
    await saveRewards(owner, state);
    return rewardView(state, run.id);
  });
}
const validMap = z
  .string()
  .refine((id) => rewardMaps.some((map) => map.id === id));
const actionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("move"),
      itemId: z.string(),
      position: z
        .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
        .strict(),
    })
    .strict(),
  z.object({ action: z.literal("reset_layout"), mapId: validMap }).strict(),
  z
    .object({
      action: z.literal("map"),
      mapId: z.string().refine((id) => rewardMaps.some((map) => map.id === id)),
    })
    .strict(),
  z
    .object({ action: z.enum(["buy", "place", "store"]), itemId: z.string() })
    .strict(),
]);
export async function changeRewards(owner: string, input: unknown) {
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError("Thao tác vật phẩm hoặc bản đồ chưa hợp lệ.");
  const action = parsed.data;
  return lock(`rewards:${owner}`, async () => {
    const state = await readRewards(owner);
    if (action.action === "map") {
      state.activeMap = action.mapId as RewardMapId;
      await saveRewards(owner, state);
      return rewardView(state);
    }
    if (action.action === "reset_layout") {
      if (action.mapId !== (state.activeMap ?? "study"))
        throw new AppError("Bản đồ đã thay đổi. Con tải lại trang nhé.", 409);
      const positions = state.positions ?? {};
      for (const item of rewardItems.filter(
        (entry) => entry.map === action.mapId,
      ))
        delete positions[item.id];
      state.positions = positions;
      await saveRewards(owner, state);
      return rewardView(state);
    }
    const item = rewardItems.find((entry) => entry.id === action.itemId);
    if (!item) throw new AppError("Không tìm thấy vật phẩm.", 404);
    if (item.map !== (state.activeMap ?? "study"))
      throw new AppError(
        "Bản đồ đã thay đổi. Con tải lại trang để chọn vật phẩm nhé.",
        409,
      );
    if (action.action === "buy" && !state.owned.includes(item.id)) {
      if (state.balance < item.price)
        throw new AppError("Con chưa đủ sao để đổi món này.", 409);
      state.balance -= item.price;
      state.owned.push(item.id);
    }
    if (!state.owned.includes(item.id))
      throw new AppError("Hãy đổi vật phẩm trước khi đặt vào góc.", 409);
    if (action.action === "move") {
      if (!state.placed.includes(item.id))
        throw new AppError(
          "Hãy đặt vật phẩm vào bản đồ trước khi di chuyển.",
          409,
        );
      (state.positions ??= {})[item.id] = clampRewardPosition(
        item.id,
        action.position,
      );
    }
    state.placed = state.placed.filter((id) => id !== item.id);
    if (action.action !== "store") state.placed.push(item.id);
    await saveRewards(owner, state);
    return rewardView(state);
  });
}
