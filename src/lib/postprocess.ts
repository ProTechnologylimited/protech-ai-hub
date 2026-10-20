import { promoterOutputSchema, type PromoterOutput } from "./validation";

/** Trim whitespace, drop wrapping code fences / quotes, and hard-cap length. */
export function cleanText(raw: string, maxChars: number): string {
  let t = raw.trim();
  const fence = t.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  if (fence) t = fence[1].trim();
  if (t.length >= 2 && /^["“”'‘’].*["“”'‘’]$/s.test(t) && !t.slice(1, -1).match(/["“”]/)) {
    t = t.slice(1, -1).trim();
  }
  return t.slice(0, maxChars);
}

/** Parse the promoter JSON. Returns null when the model output is not valid. */
export function parsePromoter(raw: string): PromoterOutput | null {
  let text = raw.trim();
  const fence = text.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = promoterOutputSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function renderPromoter(p: PromoterOutput): string {
  return [
    "Promotional cast:",
    p.cast,
    "",
    "Short project description:",
    p.description,
    "",
    "Alternative headlines:",
    ...p.headlines.map((h, i) => `${i + 1}. ${h}`),
    "",
    "Call to action:",
    p.cta,
  ].join("\n");
}
