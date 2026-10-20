import { getConfig, type AppConfig } from "@/lib/config";
import type { AiProvider, AiRequest } from "@/lib/ai/provider";
import { AiProviderError } from "@/lib/ai/provider";
import type { GenerationRecord, SaveGenerationInput, Store } from "@/lib/store";

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    ...getConfig({
      NODE_ENV: "test",
      NEXT_PUBLIC_APP_URL: "https://hub.example.com",
      AI_API_KEY: "test-key",
      AI_MODEL: "test-model",
      DAILY_GENERATION_LIMIT: "3",
    } as unknown as NodeJS.ProcessEnv),
    ...overrides,
  };
}

/** In-memory Store that enforces the same user scoping the SQL does. */
export class FakeStore implements Store {
  users = new Map<number, string>();
  usage = new Map<string, number>();
  rows: Array<GenerationRecord & { userId: string }> = [];
  saveShouldFail = false;
  private seq = 0;

  async upsertUser(fid: number) {
    if (!this.users.has(fid)) this.users.set(fid, `00000000-0000-4000-8000-${String(++this.seq).padStart(12, "0")}`);
    return { id: this.users.get(fid) as string };
  }
  async getUsage(userId: string, date: string) {
    return this.usage.get(`${userId}|${date}`) ?? 0;
  }
  async reserveUsage(userId: string, date: string, limit: number) {
    const key = `${userId}|${date}`;
    const used = this.usage.get(key) ?? 0;
    if (limit <= 0 || used >= limit) return { ok: false, used };
    this.usage.set(key, used + 1);
    return { ok: true, used: used + 1 };
  }
  async releaseUsage(userId: string, date: string) {
    const key = `${userId}|${date}`;
    this.usage.set(key, Math.max(0, (this.usage.get(key) ?? 0) - 1));
  }
  async saveGeneration(input: SaveGenerationInput) {
    if (this.saveShouldFail) throw new Error("db down");
    const id = `10000000-0000-4000-8000-${String(++this.seq).padStart(12, "0")}`;
    const createdAt = new Date(2026, 0, 1, 0, 0, this.seq).toISOString();
    this.rows.push({
      id,
      userId: input.userId,
      tool: input.tool,
      title: input.title,
      inputMeta: input.inputMeta,
      output: input.output,
      outputData: input.outputData,
      model: input.model,
      createdAt,
    });
    return { id, createdAt };
  }
  async listGenerations(userId: string, limit: number, offset: number) {
    const mine = this.rows.filter((r) => r.userId === userId).reverse();
    const slice = mine.slice(offset, offset + limit + 1);
    return {
      items: slice.slice(0, limit).map((r) => ({
        id: r.id,
        tool: r.tool,
        title: r.title,
        preview: r.output.slice(0, 160),
        createdAt: r.createdAt,
      })),
      hasMore: slice.length > limit,
    };
  }
  async getGeneration(userId: string, id: string) {
    const r = this.rows.find((x) => x.id === id && x.userId === userId);
    if (!r) return null;
    const { userId: _u, ...record } = r;
    void _u;
    return record;
  }
  async deleteGeneration(userId: string, id: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter((x) => !(x.id === id && x.userId === userId));
    return this.rows.length < before;
  }
}

export function fakeProvider(text: string | (() => string), calls: AiRequest[] = []): AiProvider {
  return {
    name: "fake",
    async generate(req) {
      calls.push(req);
      return { text: typeof text === "function" ? text() : text, model: "fake-model" };
    },
  };
}

export function failingProvider(code: "timeout" | "provider_error" | "rate_limited" = "provider_error"): AiProvider {
  return {
    name: "failing",
    async generate() {
      throw new AiProviderError(code, "provider failed");
    },
  };
}

export const castBody = {
  tool: "cast_writer",
  input: { topic: "We shipped v2", objective: "share_update", tone: "friendly", length: "short" },
};

export const promoterJson = JSON.stringify({
  cast: "Meet Acme, a new way to plan trips.",
  description: "Acme helps travellers plan trips together.",
  headlines: ["Plan together", "Trips, simplified", "Travel with less friction"],
  cta: "Try Acme today",
});
