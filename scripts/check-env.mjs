import nextEnv from "@next/env";
import { productionConfigErrors } from "../src/server/runtime-config.mjs";

if (process.versions.node.split(".")[0] !== "24") {
  console.error("Dự án yêu cầu Node.js 24.x cho cả local và Vercel.");
  process.exit(1);
}
if (process.env.NODE_ENV && process.env.NODE_ENV !== "production") {
  console.error(
    "Hãy bỏ NODE_ENV khỏi shell hoặc đặt production khi chạy bản production.",
  );
  process.exit(1);
}
process.env.NODE_ENV = "production";
nextEnv.loadEnvConfig(process.cwd(), false);
const errors = productionConfigErrors();
if (errors.length) {
  console.error(errors.join("\n"));
  console.error(
    "Cấu hình trong .env.production.local hoặc môi trường deploy. Production không dùng kho .data.",
  );
  process.exit(1);
}
console.log(
  "Cấu hình production đủ: PostgreSQL + Blob + AI. Chưa xác minh kết nối hoặc quyền truy cập.",
);
