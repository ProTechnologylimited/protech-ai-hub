// Server-side configuration. Read lazily so tests can change process.env.
// Never import this file from client components.

export type AiProviderName = "anthropic" | "openai-compatible";

export type AppConfig = {
  appUrl: string;
  appDomain: string | null;
  generationEnabled: boolean;
  dailyLimit: number;
  maxInputChars: number;
  maxOutputTokens: number;
  maxOutputChars: number;
  rateLimitPerMinute: number;
  historyMaxPerUser: number;
  aiProvider: AiProviderName;
  aiApiKey: string | null;
  aiModel: string | null;
  aiBaseUrl: string | null;
  aiTimeoutMs: number;
  devAuthEnabled: boolean;
};

function int(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function str(env: NodeJS.ProcessEnv, name: string): string | null {
  const v = env[name]?.trim();
  return v ? v : null;
}

export function getConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const appUrl = (str(env, "NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  let appDomain: string | null = null;
  try {
    appDomain = new URL(appUrl).host;
  } catch {
    appDomain = null;
  }

  const providerRaw = str(env, "AI_PROVIDER") ?? "anthropic";
  const aiProvider: AiProviderName = providerRaw === "openai-compatible" ? "openai-compatible" : "anthropic";

  return {
    appUrl,
    appDomain,
    generationEnabled: (str(env, "GENERATION_ENABLED") ?? "true").toLowerCase() !== "false",
    dailyLimit: int(env, "DAILY_GENERATION_LIMIT", 10, 0, 10_000),
    maxInputChars: int(env, "MAX_INPUT_CHARS", 3000, 100, 20_000),
    maxOutputTokens: int(env, "MAX_OUTPUT_TOKENS", 600, 50, 4000),
    maxOutputChars: 4000,
    rateLimitPerMinute: int(env, "RATE_LIMIT_PER_MINUTE", 5, 1, 600),
    historyMaxPerUser: int(env, "HISTORY_MAX_PER_USER", 200, 10, 5000),
    aiProvider,
    aiApiKey: str(env, "AI_API_KEY"),
    aiModel: str(env, "AI_MODEL") ?? (aiProvider === "anthropic" ? "claude-haiku-5-5" : null),
    aiBaseUrl: str(env, "AI_BASE_URL"),
    aiTimeoutMs: int(env, "AI_TIMEOUT_MS", 30_000, 1000, 120_000),
    // Development-only bypass. Can never be enabled when NODE_ENV is "production".
    devAuthEnabled: env.NODE_ENV !== "production" && env.DEV_AUTH_ENABLED === "true",
  };
}
