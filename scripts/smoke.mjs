import assert from "node:assert/strict";

const base = new URL(process.argv[2] || "http://127.0.0.1:3000");
if (
  !["http:", "https:"].includes(base.protocol) ||
  base.username ||
  base.password
)
  throw new Error("Cần URL http(s) không chứa thông tin đăng nhập.");

async function get(path) {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(30000),
    redirect: "manual",
  });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response;
}

try {
  const page = await get("/");
  const html = await page.text();
  const assets = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(
        (m) => m[1].replaceAll("&amp;", "&"),
      ),
    ),
  ];
  assert.ok(
    assets.some((asset) => asset.endsWith(".js")),
    "Thiếu JavaScript production",
  );
  assert.ok(
    assets.some((asset) => asset.endsWith(".css")),
    "Thiếu CSS production",
  );
  await Promise.all(assets.map((asset) => get(asset)));
  const response = await get("/api/documents/config");
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  const config = await response.json();
  assert.equal(config.storage, "blob", "Production phải dùng Blob");
  assert.equal(config.storageConfigured, true, "Chưa cấu hình Blob");
  assert.equal(config.configured, true, "Chưa cấu hình AI");
  assert.equal(config.sharedLibrary, true);
  const cookie = response.headers.get("set-cookie") || "";
  assert.match(cookie, /HttpOnly/i);
  if (base.protocol === "https:") assert.match(cookie, /Secure/i);
  // Exercises the actual database path; does not upload files or invoke paid AI.
  const history = await get("/api/documents/history");
  await history.json();
  console.log(
    `PASS: trang chủ, ${assets.length} assets, cloud config, cookie và API/database. Cần nghiệm thu upload/Workflow/AI riêng.`,
  );
} catch (error) {
  console.error(`Smoke test thất bại: ${error.message}`);
  process.exitCode = 1;
}
