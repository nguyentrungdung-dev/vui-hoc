import { test } from "node:test";
import assert from "node:assert/strict";
import { productionConfigErrors, requiresCloud } from "./runtime-config.mjs";
import { databaseEnabled } from "./database";

test("Production requires cloud even on a Mac; only development may use disk", () => {
  assert.equal(requiresCloud({ NODE_ENV: "production" }), true);
  assert.equal(requiresCloud({ VERCEL: "1" }), true);
  assert.equal(requiresCloud({ NODE_ENV: "development" }), false);
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.DATABASE_URL;
    delete process.env.VERCEL;
    assert.throws(() => databaseEnabled(), /DATABASE_URL/);
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.equal(databaseEnabled(), false);
  } finally {
    process.env = saved;
  }
});

test("Production configuration reports missing or malformed values without secrets", () => {
  assert.equal(productionConfigErrors({}).length, 4);
  const env = {
    DATABASE_URL: "postgresql://user:secret@localhost/app",
    BLOB_READ_WRITE_TOKEN: "test-token",
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_MODEL: "explicit-model",
  };
  assert.deepEqual(productionConfigErrors(env), []);
  for (const value of [
    "https://user:secret@example.com/db",
    "secret",
    "postgresql://localhost",
  ]) {
    const errors = productionConfigErrors({ ...env, DATABASE_URL: value });
    assert.equal(errors.length, 1);
    assert.ok(!errors.join().includes("secret"));
  }
  assert.deepEqual(
    productionConfigErrors({ ...env, OPENROUTER_API_KEY: "  " }),
    ["Thiếu OPENROUTER_API_KEY."],
  );
});
