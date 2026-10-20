import { AiProviderError, statusToError, timedFetch, type AiProvider, type ProviderSettings } from "./provider";

type AnthropicResponse = {
  model?: string;
  content?: Array<{ type: string; text?: string }>;
};

export function createAnthropicProvider(settings: ProviderSettings): AiProvider {
  const base = (settings.baseUrl ?? "https://api.anthropic.com").replace(/\/+$/, "");

  return {
    name: "anthropic",
    async generate({ system, user, maxTokens }) {
      const res = await timedFetch(
        `${base}/v1/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": settings.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: settings.model,
            max_tokens: maxTokens,
            system,
            messages: [{ role: "user", content: user }],
          }),
        },
        settings.timeoutMs
      );

      if (!res.ok) throw statusToError(res.status);

      let data: AnthropicResponse;
      try {
        data = (await res.json()) as AnthropicResponse;
      } catch {
        throw new AiProviderError("bad_response", "The AI provider returned an unreadable response.");
      }
      const text = (data.content ?? [])
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("")
        .trim();
      if (!text) throw new AiProviderError("bad_response", "The AI provider returned no text.");
      return { text, model: data.model ?? settings.model };
    },
  };
}
