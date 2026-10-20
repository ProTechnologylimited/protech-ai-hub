import { authenticate, AuthError, type Verifier } from "./auth";
import type { AiProvider } from "./ai/provider";
import type { AppConfig } from "./config";
import { generate, ServiceError, usageInfo } from "./generate-service";
import type { Store } from "./store";
import type { ApiErrorBody, HistoryDetail, HistoryListResponse, MeResponse } from "./types";
import { utcDate } from "./util";

export type HandlerDeps = {
  getConfig: () => AppConfig;
  verifier: Verifier;
  store: Store;
  getProvider: (config: AppConfig) => AiProvider;
  throttle: (key: string, limit: number) => boolean;
  now: () => Date;
};

const MAX_BODY_BYTES = 20_000;
const PAGE_SIZE = 20;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function errorBody(code: string, message: string, details?: Record<string, string>): ApiErrorBody {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

/** Converts any thrown value into a safe response. Never leaks stack traces or internals. */
function toResponse(err: unknown): Response {
  if (err instanceof AuthError || err instanceof ServiceError) {
    const details = err instanceof ServiceError ? err.details : undefined;
    return json(errorBody(err.code, err.message, details), err.status);
  }
  const name = err instanceof Error ? err.name : "unknown";
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : undefined;
  console.error("[api] unexpected error", { name, code });
  return json(errorBody("internal_error", "Something went wrong on our side. Try again."), 500);
}

async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new ServiceError(413, "payload_too_large", "The request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ServiceError(400, "invalid_json", "The request body must be valid JSON.");
  }
}

export function createHandlers(deps: HandlerDeps) {
  async function requireUser(req: Request): Promise<{ userId: string; fid: number; config: AppConfig }> {
    const config = deps.getConfig();
    const { fid } = await authenticate(req, { config, verifier: deps.verifier });
    const { id } = await deps.store.upsertUser(fid);
    return { userId: id, fid, config };
  }

  return {
    async me(req: Request): Promise<Response> {
      try {
        const { userId, fid, config } = await requireUser(req);
        const now = deps.now();
        const used = await deps.store.getUsage(userId, utcDate(now));
        const body: MeResponse = {
          fid,
          usage: usageInfo(used, config.dailyLimit, now),
          generationEnabled: config.generationEnabled,
          providerConfigured: Boolean(config.aiApiKey && config.aiModel),
        };
        return json(body);
      } catch (err) {
        return toResponse(err);
      }
    },

    async generate(req: Request): Promise<Response> {
      try {
        const { userId } = await requireUser(req);
        const body = await readJson(req);
        const result = await generate(
          {
            config: deps.getConfig(),
            store: deps.store,
            getProvider: deps.getProvider,
            throttle: deps.throttle,
            now: deps.now,
          },
          userId,
          body
        );
        return json(result);
      } catch (err) {
        return toResponse(err);
      }
    },

    async historyList(req: Request): Promise<Response> {
      try {
        const { userId } = await requireUser(req);
        const url = new URL(req.url);
        const page = Math.max(0, Number.parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
        const { items, hasMore } = await deps.store.listGenerations(userId, PAGE_SIZE, page * PAGE_SIZE);
        const body: HistoryListResponse = { items, hasMore, page };
        return json(body);
      } catch (err) {
        return toResponse(err);
      }
    },

    async historyGet(req: Request, id: string): Promise<Response> {
      try {
        const { userId } = await requireUser(req);
        const record = await deps.store.getGeneration(userId, id);
        if (!record) throw new ServiceError(404, "not_found", "That saved result was not found.");
        const body: HistoryDetail = record;
        return json(body);
      } catch (err) {
        return toResponse(err);
      }
    },

    async historyDelete(req: Request, id: string): Promise<Response> {
      try {
        const { userId } = await requireUser(req);
        const deleted = await deps.store.deleteGeneration(userId, id);
        if (!deleted) throw new ServiceError(404, "not_found", "That saved result was not found.");
        return json({ deleted: true });
      } catch (err) {
        return toResponse(err);
      }
    },
  };
}

export type Handlers = ReturnType<typeof createHandlers>;
