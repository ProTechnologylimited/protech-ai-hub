import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __protechPool?: Pool };

/** Lazily creates a shared pool. DATABASE_URL is server-only and never sent to the browser. */
export function getPool(): Pool {
  if (!globalForPg.__protechPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForPg.__protechPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForPg.__protechPool;
}
