// Runs against a REAL PostgreSQL database. Skipped unless TEST_DATABASE_URL is set.
// Use a disposable database: the test applies migrations/001_init.sql and creates/deletes its own users.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("repo (PostgreSQL integration)", () => {
  let repo: typeof import("@/lib/repo").repo;
  let pool: import("pg").Pool;
  const FIDS = [990000001, 990000002];

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const db = await import("@/lib/db");
    pool = db.getPool();
    await pool.query(readFileSync(path.join(__dirname, "..", "migrations", "001_init.sql"), "utf8"));
    repo = (await import("@/lib/repo")).repo;
    await pool.query("delete from users where fid = any($1::bigint[])", [FIDS]);
  });

  afterAll(async () => {
    await pool.query("delete from users where fid = any($1::bigint[])", [FIDS]);
    await pool.end();
  });

  it("upserts users idempotently", async () => {
    const a = await repo.upsertUser(FIDS[0]);
    const b = await repo.upsertUser(FIDS[0]);
    expect(a.id).toBe(b.id);
  });

  it("enforces the daily limit atomically, even under concurrency", async () => {
    const u = await repo.upsertUser(FIDS[0]);
    const results = await Promise.all(Array.from({ length: 10 }, () => repo.reserveUsage(u.id, "2026-10-20", 3)));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(await repo.getUsage(u.id, "2026-10-20")).toBe(3);
    await repo.releaseUsage(u.id, "2026-10-20");
    expect(await repo.getUsage(u.id, "2026-10-20")).toBe(2);
  });

  it("stores, lists, reads and deletes history scoped to the owner", async () => {
    const owner = await repo.upsertUser(FIDS[0]);
    const other = await repo.upsertUser(FIDS[1]);
    const saved = await repo.saveGeneration(
      { userId: owner.id, tool: "cast_writer", title: "t", inputMeta: { a: 1 }, output: "out", outputData: null, model: "m" },
      200
    );

    expect((await repo.getGeneration(owner.id, saved.id))?.output).toBe("out");
    expect(await repo.getGeneration(other.id, saved.id)).toBeNull();
    expect(await repo.deleteGeneration(other.id, saved.id)).toBe(false);
    expect((await repo.listGenerations(other.id, 20, 0)).items).toHaveLength(0);
    expect((await repo.listGenerations(owner.id, 20, 0)).items.length).toBeGreaterThan(0);
    expect(await repo.getGeneration(owner.id, "not-a-uuid")).toBeNull();
    expect(await repo.deleteGeneration(owner.id, saved.id)).toBe(true);
  });

  it("trims history to the per-user cap", async () => {
    const owner = await repo.upsertUser(FIDS[1]);
    for (let i = 0; i < 5; i++) {
      await repo.saveGeneration(
        { userId: owner.id, tool: "cast_writer", title: `t${i}`, inputMeta: {}, output: `o${i}`, outputData: null, model: "m" },
        3
      );
    }
    const { items } = await repo.listGenerations(owner.id, 20, 0);
    expect(items).toHaveLength(3);
  });
});
