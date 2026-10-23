import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

// Unit tests must never inherit the real application database or AI credentials.
const env = { ...process.env, NODE_ENV: "test" };
for (const key of [
  "DATABASE_URL",
  "BLOB_READ_WRITE_TOKEN",
  "OPENROUTER_API_KEY",
  "VERCEL",
])
  delete env[key];
const files = ["src/lib", "src/server"].flatMap((dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".test.ts"))
    .map((name) => `${dir}/${name}`),
);
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  { env, stdio: "inherit" },
);
process.exit(result.status ?? 1);
