import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { databaseEnabled, query } from "./database";
import { dataRoot } from "./store";
function file(kind: string, key: string) {
  return path.join(
    dataRoot(),
    "accounts",
    kind,
    createHash("sha256").update(key).digest("hex") + ".json",
  );
}
export async function readRecord<T>(
  kind: string,
  key: string,
): Promise<T | null> {
  if (databaseEnabled())
    return (
      (
        await query<{ data: T }>(
          "SELECT data FROM vuihoc_account_records WHERE kind=$1 AND key=$2",
          [kind, key],
        )
      ).rows[0]?.data ?? null
    );
  try {
    return JSON.parse(await fs.readFile(file(kind, key), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
export async function writeRecord(kind: string, key: string, data: unknown) {
  if (databaseEnabled()) {
    await query(
      "INSERT INTO vuihoc_account_records(kind,key,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(kind,key) DO UPDATE SET data=EXCLUDED.data",
      [kind, key, JSON.stringify(data)],
    );
    return;
  }
  const target = file(kind, key);
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = target + randomUUID() + ".tmp";
  await fs.writeFile(temp, JSON.stringify(data), { mode: 0o600 });
  await fs.rename(temp, target);
}
export async function listRecords<T>(kind: string): Promise<T[]> {
  if (databaseEnabled())
    return (
      await query<{ data: T }>(
        "SELECT data FROM vuihoc_account_records WHERE kind=$1",
        [kind],
      )
    ).rows.map((r) => r.data);
  const dir = path.dirname(file(kind, ""));
  const names = await fs.readdir(dir).catch((e) => {
    if (e.code === "ENOENT") return [];
    throw e;
  });
  return Promise.all(
    names
      .filter((n) => n.endsWith(".json"))
      .map(async (n) =>
        JSON.parse(await fs.readFile(path.join(dir, n), "utf8")),
      ),
  );
}
