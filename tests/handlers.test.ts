import { describe, expect, it, vi } from "vitest";
import { AuthError, authenticate, type Verifier } from "@/lib/auth";
import { createHandlers } from "@/lib/handlers";
import { createThrottle } from "@/lib/throttle";
import { getConfig } from "@/lib/config";
import { castBody, fakeProvider, FakeStore, testConfig } from "./helpers";

const NOW = new Date("2026-10-20T12:00:00Z");

// Test verifier: token "token-<fid>" is valid; anything else is rejected.
const verifier: Verifier = async (token, domain) => {
  expect(domain).toBe("hub.example.com");
  const m = token.match(/^token-(\d+)$/);
  if (!m) throw new AuthError(401, "unauthorized", "Your session is invalid or expired. Reopen the app.");
  return { fid: Number(m[1]) };
};

function setup(configOverrides = {}) {
  const store = new FakeStore();
  const handlers = createHandlers({
    getConfig: () => testConfig(configOverrides),
    verifier,
    store,
    getProvider: () => fakeProvider("Hello Farcaster"),
    throttle: createThrottle(),
    now: () => NOW,
  });
  return { store, handlers };
}

const as = (fid: number, init: RequestInit = {}, url = "https://hub.example.com/api/x") =>
  new Request(url, { ...init, headers: { authorization: `Bearer token-${fid}`, "content-type": "application/json", ...(init.headers ?? {}) } });

const anon = (init: RequestInit = {}, url = "https://hub.example.com/api/x") => new Request(url, init);

describe("authentication enforcement", () => {
  it("rejects every protected endpoint without a token", async () => {
    const { handlers } = setup();
    const id = "10000000-0000-4000-8000-000000000001";
    const responses = await Promise.all([
      handlers.me(anon()),
      handlers.generate(anon({ method: "POST", body: JSON.stringify(castBody) })),
      handlers.historyList(anon()),
      handlers.historyGet(anon(), id),
      handlers.historyDelete(anon({ method: "DELETE" }), id),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("unauthorized");
    }
  });

  it("rejects invalid tokens and malformed Authorization headers", async () => {
    const { handlers } = setup();
    const bad = await handlers.me(anon({ headers: { authorization: "Bearer nope" } }));
    expect(bad.status).toBe(401);
    const basic = await handlers.me(anon({ headers: { authorization: "Basic abc" } }));
    expect(basic.status).toBe(401);
  });

  it("does not call the AI provider for unauthenticated generate requests", async () => {
    const getProvider = vi.fn();
    const handlers = createHandlers({
      getConfig: () => testConfig(),
      verifier,
      store: new FakeStore(),
      getProvider,
      throttle: () => true,
      now: () => NOW,
    });
    const res = await handlers.generate(anon({ method: "POST", body: JSON.stringify(castBody) }));
    expect(res.status).toBe(401);
    expect(getProvider).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied FID header when dev auth is off", async () => {
    const { handlers } = setup();
    const res = await handlers.me(anon({ headers: { "x-dev-fid": "42" } }));
    expect(res.status).toBe(401);
  });

  it("dev bypass is impossible in production even if DEV_AUTH_ENABLED=true", () => {
    const prod = getConfig({ NODE_ENV: "production", DEV_AUTH_ENABLED: "true" } as unknown as NodeJS.ProcessEnv);
    expect(prod.devAuthEnabled).toBe(false);
    const dev = getConfig({ NODE_ENV: "development", DEV_AUTH_ENABLED: "true" } as unknown as NodeJS.ProcessEnv);
    expect(dev.devAuthEnabled).toBe(true);
  });

  it("dev bypass works only when explicitly enabled outside production", async () => {
    const config = testConfig({ devAuthEnabled: true });
    const out = await authenticate(anon({ headers: { "x-dev-fid": "7" } }), { config, verifier });
    expect(out.fid).toBe(7);
    await expect(authenticate(anon({ headers: { "x-dev-fid": "-1" } }), { config, verifier })).rejects.toBeInstanceOf(AuthError);
  });

  it("returns usage for an authenticated user", async () => {
    const { handlers } = setup();
    const res = await handlers.me(as(11));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ fid: 11, generationEnabled: true, providerConfigured: true });
    expect(body.usage).toMatchObject({ used: 0, limit: 3, remaining: 3 });
  });
});

describe("generate endpoint", () => {
  it("rejects invalid JSON and invalid fields with 400", async () => {
    const { handlers } = setup();
    const notJson = await handlers.generate(as(1, { method: "POST", body: "{oops" }));
    expect(notJson.status).toBe(400);
    const empty = await handlers.generate(
      as(1, { method: "POST", body: JSON.stringify({ tool: "cast_writer", input: { ...castBody.input, topic: "" } }) })
    );
    expect(empty.status).toBe(400);
    expect((await empty.json()).error.details.topic).toBeTruthy();
  });

  it("rejects oversized bodies", async () => {
    const { handlers } = setup();
    const res = await handlers.generate(as(1, { method: "POST", body: "x".repeat(25_000) }));
    expect(res.status).toBe(413);
  });

  it("generates, saves, and enforces the daily limit end to end", async () => {
    const { handlers } = setup();
    for (let i = 0; i < 3; i++) {
      const ok = await handlers.generate(as(5, { method: "POST", body: JSON.stringify(castBody) }));
      expect(ok.status).toBe(200);
    }
    const blocked = await handlers.generate(as(5, { method: "POST", body: JSON.stringify(castBody) }));
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe("daily_limit");
  });

  it("returns a generic 500 without internals when the store throws", async () => {
    const store = new FakeStore();
    store.getUsage = async () => {
      throw new Error("password=hunter2 at /srv/app");
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handlers = createHandlers({
      getConfig: () => testConfig(),
      verifier,
      store,
      getProvider: () => fakeProvider("x"),
      throttle: () => true,
      now: () => NOW,
    });
    const res = await handlers.me(as(1));
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toMatch(/hunter2|srv/);
    spy.mockRestore();
  });
});

describe("history authorization", () => {
  async function seed() {
    const ctx = setup();
    await ctx.handlers.generate(as(100, { method: "POST", body: JSON.stringify(castBody) }));
    const list = await (await ctx.handlers.historyList(as(100))).json();
    return { ...ctx, id: list.items[0].id as string };
  }

  it("owner can list, read and delete their own records", async () => {
    const { handlers, id } = await seed();
    const got = await handlers.historyGet(as(100), id);
    expect(got.status).toBe(200);
    expect((await got.json()).output).toBe("Hello Farcaster");
    const del = await handlers.historyDelete(as(100, { method: "DELETE" }), id);
    expect(del.status).toBe(200);
    expect((await handlers.historyGet(as(100), id)).status).toBe(404);
  });

  it("another user cannot read a record they do not own", async () => {
    const { handlers, id } = await seed();
    const res = await handlers.historyGet(as(200), id);
    expect(res.status).toBe(404);
  });

  it("another user cannot delete a record and the record survives", async () => {
    const { handlers, id } = await seed();
    const res = await handlers.historyDelete(as(200, { method: "DELETE" }), id);
    expect(res.status).toBe(404);
    expect((await handlers.historyGet(as(100), id)).status).toBe(200);
  });

  it("another user's list never contains the owner's records", async () => {
    const { handlers } = await seed();
    const body = await (await handlers.historyList(as(200))).json();
    expect(body.items).toHaveLength(0);
  });

  it("paginates the list", async () => {
    const { handlers } = setup({ rateLimitPerMinute: 100, dailyLimit: 100 });
    for (let i = 0; i < 25; i++) {
      await handlers.generate(as(9, { method: "POST", body: JSON.stringify(castBody) }));
    }
    const p0 = await (await handlers.historyList(as(9, {}, "https://hub.example.com/api/history?page=0"))).json();
    const p1 = await (await handlers.historyList(as(9, {}, "https://hub.example.com/api/history?page=1"))).json();
    expect(p0.items).toHaveLength(20);
    expect(p0.hasMore).toBe(true);
    expect(p1.items).toHaveLength(5);
    expect(p1.hasMore).toBe(false);
  });
});
