import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { AppError } from "./validation";
import { requiresCloud } from "./runtime-config.mjs";

const transaction = new AsyncLocalStorage<PoolClient>();
let pool: Pool | undefined;
let initialized: Promise<void> | undefined;
export function databaseEnabled() {
  if (process.env.DATABASE_URL?.trim()) return true;
  if (requiresCloud())
    throw new AppError(
      "Chưa cấu hình DATABASE_URL. Production yêu cầu PostgreSQL, không dùng kho file local.",
      503,
    );
  return false;
}
function getPool() {
  if (!databaseEnabled())
    throw new AppError("Chưa cấu hình DATABASE_URL.", 503);
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    // Keep connections across pauses between answers instead of reconnecting each time.
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: true,
  });
  pool.on("error", () =>
    console.error(
      "Database idle connection interrupted; next request will reconnect.",
    ),
  );
  return pool;
}
// The advisory lock serializes first-use schema setup across serverless instances.
export async function ensureDatabase() {
  if (!initialized)
    initialized = (async () => {
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '15s'");
        await client.query("SELECT pg_advisory_xact_lock(727409301)");
        await client.query(`
        CREATE TABLE IF NOT EXISTS vuihoc_account_records (
          kind text NOT NULL, key text NOT NULL, data jsonb NOT NULL, PRIMARY KEY(kind,key)
        );
        CREATE TABLE IF NOT EXISTS vuihoc_documents (
          id uuid PRIMARY KEY,
          owner text NOT NULL,
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS vuihoc_documents_owner ON vuihoc_documents(owner);
        CREATE TABLE IF NOT EXISTS vuihoc_runs (
          id uuid PRIMARY KEY,
          document_id uuid NOT NULL REFERENCES vuihoc_documents(id),
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS vuihoc_runs_document ON vuihoc_runs(document_id);
        CREATE TABLE IF NOT EXISTS vuihoc_rewards (
          owner text PRIMARY KEY,
          data jsonb NOT NULL
        );
        CREATE TABLE IF NOT EXISTS vuihoc_guidance (
          id text PRIMARY KEY,
          document_id uuid NOT NULL REFERENCES vuihoc_documents(id) ON DELETE CASCADE,
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS vuihoc_guidance_document ON vuihoc_guidance(document_id);
      `);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      initialized = undefined;
      throw error;
    });
  return initialized;
}
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  await ensureDatabase();
  return (transaction.getStore() ?? getPool()).query<T>(sql, values);
}
export async function databaseLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  await ensureDatabase();
  const current = transaction.getStore();
  if (current) {
    await current.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [key],
    );
    return fn();
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN; SET LOCAL lock_timeout = '5s'");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [key],
    );
    const result = await transaction.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if ((error as { code?: string }).code === "55P03")
      throw new AppError(
        "Bài đang được cập nhật. Hãy thử lại sau vài giây.",
        409,
      );
    throw error;
  } finally {
    client.release();
  }
}
export async function closeDatabase() {
  await pool?.end();
  pool = undefined;
  initialized = undefined;
}
