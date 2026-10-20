import { afterEach, describe, expect, it, vi } from "vitest";
import { createProvider } from "@/lib/ai";
import { createAnthropicProvider } from "@/lib/ai/anthropic";
import { createOpenAiCompatibleProvider } from "@/lib/ai/openai-compatible";
import { testConfig } from "./helpers";

const settings = { apiKey: "k", model: "m", baseUrl: null, timeoutMs: 1000 };
const req = { system: "s", user: "u", maxTokens: 50 };

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("provider factory", () => {
  it("throws not_configured when the API key is missing", () => {
    expect(() => createProvider(testConfig({ aiApiKey: null }))).toThrowError(/AI_API_KEY/);
  });
  it("throws not_configured when the model is missing", () => {
    expect(() => createProvider(testConfig({ aiModel: null }))).toThrowError(/AI_MODEL/);
  });
});

describe("anthropic provider", () => {
  it("sends the key in a header, never in the body, and parses text", async () => {
    let seen = null as { url: string; init: RequestInit } | null;
    stubFetch(async (url, init) => {
      seen = { url, init };
      return new Response(JSON.stringify({ model: "m", content: [{ type: "text", text: " hi " }] }), { status: 200 });
    });
    const out = await createAnthropicProvider(settings).generate(req);
    expect(out.text).toBe("hi");
    expect(seen!.url).toBe("https://api.anthropic.com/v1/messages");
    expect((seen!.init.headers as Record<string, string>)["x-api-key"]).toBe("k");
    expect(String(seen!.init.body)).not.toContain('"k"');
  });

  it("maps 429, 401 and 500 to safe errors", async () => {
    for (const [status, code] of [
      [429, "rate_limited"],
      [401, "provider_error"],
      [500, "provider_error"],
    ] as const) {
      stubFetch(async () => new Response("secret upstream detail", { status }));
      await expect(createAnthropicProvider(settings).generate(req)).rejects.toMatchObject({ code });
      await createAnthropicProvider(settings)
        .generate(req)
        .catch((e) => expect(e.message).not.toMatch(/secret upstream/));
    }
  });

  it("maps aborts to timeout and network failures to provider_error", async () => {
    stubFetch(async () => {
      const e = new Error("aborted");
      e.name = "AbortError";
      throw e;
    });
    await expect(createAnthropicProvider(settings).generate(req)).rejects.toMatchObject({ code: "timeout" });
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(createAnthropicProvider(settings).generate(req)).rejects.toMatchObject({ code: "provider_error" });
  });

  it("rejects empty or unreadable responses", async () => {
    stubFetch(async () => new Response(JSON.stringify({ content: [] }), { status: 200 }));
    await expect(createAnthropicProvider(settings).generate(req)).rejects.toMatchObject({ code: "bad_response" });
    stubFetch(async () => new Response("<html>", { status: 200 }));
    await expect(createAnthropicProvider(settings).generate(req)).rejects.toMatchObject({ code: "bad_response" });
  });
});

describe("openai-compatible provider", () => {
  it("uses bearer auth and parses the first choice", async () => {
    let init = undefined as RequestInit | undefined;
    stubFetch(async (_u, i) => {
      init = i;
      return new Response(JSON.stringify({ choices: [{ message: { content: "yo" } }] }), { status: 200 });
    });
    const out = await createOpenAiCompatibleProvider(settings).generate(req);
    expect(out.text).toBe("yo");
    expect((init!.headers as Record<string, string>).authorization).toBe("Bearer k");
  });
});
