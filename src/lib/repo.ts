import { getPool } from "./db";
import type { GenerationRecord, GenerationSummary, SaveGenerationInput, Store } from "./store";
import type { ToolId } from "./constants";
import type { PromoterOutput } from "./validation";
import { isUuid } from "./util";

type GenerationRow = {
  id: string;
  tool: ToolId;
  title: string;
  input_meta: Record<string, unknown>;
  output: string;
  output_data: PromoterOutput | null;
  model: string;
  created_at: Date;
};

type SummaryRow = {
  id: string;
  tool: ToolId;
  title: string;
  preview: string;
  created_at: Date;
};

export const repo: Store = {
  async upsertUser(fid) {
    const { rows } = await getPool().query<{ id: string }>(
      `insert into users (fid) values ($1)
       on conflict (fid) do update set fid = excluded.fid
       returning id`,
      [fid]
    );
    return { id: rows[0].id };
  },

  async getUsage(userId, date) {
    const { rows } = await getPool().query<{ generation_count: number }>(
      "select generation_count from usage_records where user_id = $1 and usage_date = $2",
      [userId, date]
    );
    return rows[0]?.generation_count ?? 0;
  },

  async reserveUsage(userId, date, limit) {
    if (limit <= 0) return { ok: false, used: 0 };
    // Single atomic statement: the WHERE on the conflict branch blocks increments past the limit.
    const { rows } = await getPool().query<{ generation_count: number }>(
      `insert into usage_records (user_id, usage_date, generation_count)
       values ($1, $2, 1)
       on conflict (user_id, usage_date)
       do update set generation_count = usage_records.generation_count + 1
       where usage_records.generation_count < $3
       returning generation_count`,
      [userId, date, limit]
    );
    if (rows.length === 0) return { ok: false, used: limit };
    return { ok: true, used: rows[0].generation_count };
  },

  async releaseUsage(userId, date) {
    await getPool().query(
      `update usage_records
         set generation_count = greatest(generation_count - 1, 0)
       where user_id = $1 and usage_date = $2`,
      [userId, date]
    );
  },

  async saveGeneration(input: SaveGenerationInput, maxPerUser: number) {
    const pool = getPool();
    const { rows } = await pool.query<{ id: string; created_at: Date }>(
      `insert into generations (user_id, tool, title, input_meta, output, output_data, model)
       values ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7)
       returning id, created_at`,
      [
        input.userId,
        input.tool,
        input.title,
        JSON.stringify(input.inputMeta),
        input.output,
        input.outputData ? JSON.stringify(input.outputData) : null,
        input.model,
      ]
    );
    // Keep only the newest `maxPerUser` records for this user.
    await pool.query(
      `delete from generations
       where user_id = $1
         and id in (
           select id from generations
           where user_id = $1
           order by created_at desc, id desc
           offset $2
         )`,
      [input.userId, maxPerUser]
    );
    return { id: rows[0].id, createdAt: rows[0].created_at.toISOString() };
  },

  async listGenerations(userId, limit, offset) {
    const { rows } = await getPool().query<SummaryRow>(
      `select id, tool, title, left(output, 160) as preview, created_at
       from generations
       where user_id = $1
       order by created_at desc, id desc
       limit $2 offset $3`,
      [userId, limit + 1, offset]
    );
    const items: GenerationSummary[] = rows.slice(0, limit).map((r) => ({
      id: r.id,
      tool: r.tool,
      title: r.title,
      preview: r.preview,
      createdAt: r.created_at.toISOString(),
    }));
    return { items, hasMore: rows.length > limit };
  },

  async getGeneration(userId, id) {
    if (!isUuid(id)) return null;
    const { rows } = await getPool().query<GenerationRow>(
      `select id, tool, title, input_meta, output, output_data, model, created_at
       from generations
       where id = $1 and user_id = $2`,
      [id, userId]
    );
    const r = rows[0];
    if (!r) return null;
    const record: GenerationRecord = {
      id: r.id,
      tool: r.tool,
      title: r.title,
      inputMeta: r.input_meta,
      output: r.output,
      outputData: r.output_data,
      model: r.model,
      createdAt: r.created_at.toISOString(),
    };
    return record;
  },

  async deleteGeneration(userId, id) {
    if (!isUuid(id)) return false;
    const { rowCount } = await getPool().query(
      "delete from generations where id = $1 and user_id = $2",
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  },
};
