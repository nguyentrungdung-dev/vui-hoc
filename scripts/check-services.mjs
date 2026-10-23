import nextEnv from "@next/env";
import pg from "pg";
import { list } from "@vercel/blob";
import { assertProductionConfig } from "../src/server/runtime-config.mjs";

process.env.NODE_ENV = "production";
nextEnv.loadEnvConfig(process.cwd(), false);
assertProductionConfig();

// Read-only probes; never log database URLs, tokens, or document metadata.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 15000,
  query_timeout: 15000,
});
const results = await Promise.allSettled([
  pool.query("SELECT 1"),
  list({
    limit: 1,
    prefix: "documents/",
    abortSignal: AbortSignal.timeout(15000),
  }),
]);
await pool.end();
for (const [index, result] of results.entries()) {
  const service = index === 0 ? "PostgreSQL" : "Blob";
  if (result.status === "fulfilled") {
    console.log(`PASS: ${service} kết nối và đọc được.`);
  } else {
    const code = String(
      result.reason?.code || result.reason?.cause?.code || "UNKNOWN",
    )
      .replace(/[^A-Z0-9_]/g, "")
      .slice(0, 40);
    const denied = /access denied|authentication failed/i.test(
      String(result.reason?.message),
    );
    console.error(
      `FAIL: ${service}: ${denied ? "thông tin xác thực bị từ chối" : `lỗi kết nối/quyền truy cập (${code})`}.`,
    );
    process.exitCode = 1;
  }
}
if (!process.exitCode)
  console.log(
    "Chưa kiểm tra quyền ghi, Workflow hoặc gọi AI; tiếp tục smoke test và nghiệm thu upload.",
  );
