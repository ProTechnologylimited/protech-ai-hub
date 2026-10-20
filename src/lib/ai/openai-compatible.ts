import { AiProviderError, statusToError, timedFetch, type AiProvider, type ProviderSettings } from "./provider";

type ChatResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
};

/** Works with any OpenAI-style /chat/completions endpoint (set AI_BASE_URL). */
export function createOpenAiCompatibleProvider(settings: ProviderSettings): AiProvider {
  const base = (settings.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");

  return {
    name: "openai-compatible",
    async generate({ system, user, maxTokens }) {
      const res = await timedFetch(
        `${base}/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            model: settings.model,
            max_tokens: maxTokens,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        },
        settings.timeoutMs
      );

      if (!res.ok) throw statusToError(res.status);

      let data: ChatResponse;
      try {
        data = (await res.json()) as ChatResponse;
      } catch {
        throw new AiProviderError("bad_response", "The AI provider returned an unreadable response.");
      }
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new AiProviderError("bad_response", "The AI provider returned no text.");
      return { text, model: data.model ?? settings.model };
    },
  };
}
