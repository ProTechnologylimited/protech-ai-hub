export type AiRequest = {
  system: string;
  user: string;
  maxTokens: number;
};

export type AiResult = {
  text: string;
  model: string;
};

export type AiErrorCode = "not_configured" | "timeout" | "rate_limited" | "provider_error" | "bad_response";

export class AiProviderError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

/** Any provider only needs to implement this. Add new providers in src/lib/ai/. */
export interface AiProvider {
  readonly name: string;
  generate(req: AiRequest): Promise<AiResult>;
}

export type ProviderSettings = {
  apiKey: string;
  model: string;
  baseUrl: string | null;
  timeoutMs: number;
};

/** fetch wrapper with timeout. Never logs request bodies. */
export async function timedFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiProviderError("timeout", "The AI provider took too long to respond.");
    }
    throw new AiProviderError("provider_error", "Could not reach the AI provider.");
  } finally {
    clearTimeout(timer);
  }
}

export function statusToError(status: number): AiProviderError {
  if (status === 429) return new AiProviderError("rate_limited", "The AI provider is busy. Try again shortly.");
  if (status === 401 || status === 403) {
    return new AiProviderError("provider_error", "The AI provider rejected the server credentials.");
  }
  return new AiProviderError("provider_error", "The AI provider returned an error.");
}
