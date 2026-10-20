import type { AppConfig } from "../config";
import { createAnthropicProvider } from "./anthropic";
import { createOpenAiCompatibleProvider } from "./openai-compatible";
import { AiProviderError, type AiProvider } from "./provider";

/** Creates the configured provider or throws AiProviderError("not_configured"). */
export function createProvider(config: AppConfig): AiProvider {
  if (!config.aiApiKey) {
    throw new AiProviderError("not_configured", "AI generation is not configured. Set AI_API_KEY on the server.");
  }
  if (!config.aiModel) {
    throw new AiProviderError("not_configured", "AI generation is not configured. Set AI_MODEL on the server.");
  }
  const settings = {
    apiKey: config.aiApiKey,
    model: config.aiModel,
    baseUrl: config.aiBaseUrl,
    timeoutMs: config.aiTimeoutMs,
  };
  return config.aiProvider === "openai-compatible"
    ? createOpenAiCompatibleProvider(settings)
    : createAnthropicProvider(settings);
}

export { AiProviderError } from "./provider";
export type { AiProvider } from "./provider";
