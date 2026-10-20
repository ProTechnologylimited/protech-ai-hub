import type { AppConfig } from "./config";
import { AiProviderError, type AiProvider } from "./ai/provider";
import { buildPrompt, titleFor } from "./prompts";
import { cleanText, parsePromoter, renderPromoter } from "./postprocess";
import type { Store } from "./store";
import type { GenerateResponse, UsageInfo } from "./types";
import { nextUtcMidnight, utcDate } from "./util";
import { formatIssues, generateRequestSchema, totalInputLength, type PromoterOutput } from "./validation";

export class ServiceError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export type GenerateDeps = {
  config: AppConfig;
  store: Store;
  getProvider: (config: AppConfig) => AiProvider;
  throttle: (key: string, limit: number) => boolean;
  now: () => Date;
};

export function usageInfo(used: number, limit: number, now: Date): UsageInfo {
  return { used, limit, remaining: Math.max(0, limit - used), resetsAt: nextUtcMidnight(now) };
}

/**
 * Runs one AI generation for an authenticated user.
 * Order matters: cheap checks first, usage is reserved BEFORE the paid call and
 * refunded if the provider fails.
 */
export async function generate(deps: GenerateDeps, userId: string, body: unknown): Promise<GenerateResponse> {
  const { config, store } = deps;
  const now = deps.now();
  const date = utcDate(now);

  if (!config.generationEnabled) {
    throw new ServiceError(503, "generation_disabled", "AI generation is temporarily turned off.");
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ServiceError(400, "invalid_request", "Check the highlighted fields and try again.", formatIssues(parsed.error));
  }
  const request = parsed.data;

  if (totalInputLength(request.input) > config.maxInputChars) {
    throw new ServiceError(
      400,
      "input_too_long",
      `Your input is too long. Keep the total under ${config.maxInputChars} characters.`
    );
  }

  if (!deps.throttle(userId, config.rateLimitPerMinute)) {
    throw new ServiceError(429, "rate_limited", "You are generating too quickly. Wait a moment and try again.");
  }

  // Fail fast (without spending allowance) when the provider is not configured.
  let provider: AiProvider;
  try {
    provider = deps.getProvider(config);
  } catch (err) {
    if (err instanceof AiProviderError && err.code === "not_configured") {
      throw new ServiceError(503, "not_configured", err.message);
    }
    throw new ServiceError(500, "internal_error", "Something went wrong on our side.");
  }

  const reservation = await store.reserveUsage(userId, date, config.dailyLimit);
  if (!reservation.ok) {
    throw new ServiceError(
      429,
      "daily_limit",
      `You have used all ${config.dailyLimit} generations for today. The allowance resets at 00:00 UTC.`
    );
  }

  const { system, user } = buildPrompt(request);

  let rawText: string;
  let model: string;
  try {
    const result = await provider.generate({ system, user, maxTokens: config.maxOutputTokens });
    rawText = result.text;
    model = result.model;
  } catch (err) {
    await store.releaseUsage(userId, date).catch(() => {});
    if (err instanceof AiProviderError) {
      const status = err.code === "timeout" ? 504 : err.code === "rate_limited" ? 503 : 502;
      throw new ServiceError(status, `ai_${err.code}`, err.message);
    }
    throw new ServiceError(502, "ai_provider_error", "The AI provider failed. Try again.");
  }

  let output: string;
  let outputData: PromoterOutput | null = null;

  if (request.tool === "project_promoter") {
    outputData = parsePromoter(rawText);
    if (!outputData) {
      await store.releaseUsage(userId, date).catch(() => {});
      throw new ServiceError(502, "ai_bad_response", "The AI returned an unexpected format. Try again.");
    }
    output = renderPromoter(outputData);
  } else {
    output = cleanText(rawText, config.maxOutputChars);
    if (!output) {
      await store.releaseUsage(userId, date).catch(() => {});
      throw new ServiceError(502, "ai_bad_response", "The AI returned an empty result. Try again.");
    }
  }

  let id: string | null = null;
  let createdAt = now.toISOString();
  let saved = false;
  try {
    const record = await store.saveGeneration(
      {
        userId,
        tool: request.tool,
        title: titleFor(request),
        inputMeta: request.input,
        output,
        outputData,
        model,
      },
      config.historyMaxPerUser
    );
    id = record.id;
    createdAt = record.createdAt;
    saved = true;
  } catch {
    // The paid call succeeded, so still return the result; the UI tells the user it was not saved.
  }

  return {
    id,
    saved,
    tool: request.tool,
    output,
    outputData,
    model,
    createdAt,
    usage: usageInfo(reservation.used, config.dailyLimit, now),
  };
}
