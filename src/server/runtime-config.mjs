/** @param {Record<string, string | undefined>} env */
export function requiresCloud(env = process.env) {
  return env.NODE_ENV === "production" || !!env.VERCEL;
}

/** Validate configuration without printing secrets or contacting services.
 * @param {Record<string, string | undefined>} env
 */
export function productionConfigErrors(env = process.env) {
  const errors = [];
  for (const key of [
    "DATABASE_URL",
    "BLOB_READ_WRITE_TOKEN",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
  ]) {
    if (!env[key]?.trim()) errors.push(`Thiếu ${key}.`);
  }
  if (env.DATABASE_URL?.trim()) {
    try {
      const url = new URL(env.DATABASE_URL);
      if (
        !["postgres:", "postgresql:"].includes(url.protocol) ||
        !url.hostname ||
        url.pathname.length < 2
      )
        errors.push("DATABASE_URL phải là URL PostgreSQL có tên database.");
    } catch {
      errors.push("DATABASE_URL không phải URL hợp lệ.");
    }
  }
  return errors;
}

export function assertProductionConfig() {
  const errors = productionConfigErrors();
  if (errors.length)
    throw new Error(`Cấu hình production chưa đủ: ${errors.join(" ")}`);
}
