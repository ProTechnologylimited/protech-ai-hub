import { describe, expect, it } from "vitest";
import {
  castWriterInput,
  formatIssues,
  generateRequestSchema,
  projectPromoterInput,
  replyAssistantInput,
  totalInputLength,
} from "@/lib/validation";
import { parsePromoter, cleanText } from "@/lib/postprocess";
import { promoterJson } from "./helpers";

describe("prompt validation", () => {
  const validCast = { topic: "hello", objective: "share_update", tone: "friendly", length: "short" };

  it("accepts a valid cast request and trims optional fields", () => {
    const r = castWriterInput.safeParse({ ...validCast, keywords: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.keywords).toBeUndefined();
  });

  it("rejects empty and whitespace-only topics", () => {
    for (const topic of ["", "   "]) {
      const r = castWriterInput.safeParse({ ...validCast, topic });
      expect(r.success).toBe(false);
      if (!r.success) expect(formatIssues(r.error).topic).toMatch(/required/i);
    }
  });

  it("rejects unknown objectives, tones and lengths", () => {
    expect(castWriterInput.safeParse({ ...validCast, objective: "go_viral" }).success).toBe(false);
    expect(castWriterInput.safeParse({ ...validCast, tone: "angry" }).success).toBe(false);
    expect(castWriterInput.safeParse({ ...validCast, length: "huge" }).success).toBe(false);
  });

  it("enforces per-field maximum length", () => {
    expect(castWriterInput.safeParse({ ...validCast, topic: "a".repeat(501) }).success).toBe(false);
  });

  it("rejects unexpected extra fields", () => {
    expect(castWriterInput.safeParse({ ...validCast, admin: true }).success).toBe(false);
  });

  it("validates reply assistant inputs", () => {
    expect(replyAssistantInput.safeParse({ original: "x", response: "", tone: "friendly" }).success).toBe(false);
    expect(replyAssistantInput.safeParse({ original: "x", response: "agree", tone: "friendly" }).success).toBe(true);
  });

  it("validates project promoter inputs", () => {
    const ok = {
      projectName: "Acme",
      description: "d",
      audience: "a",
      offering: "o",
      campaign: "launch",
      tone: "professional",
    };
    expect(projectPromoterInput.safeParse(ok).success).toBe(true);
    expect(projectPromoterInput.safeParse({ ...ok, projectName: "" }).success).toBe(false);
    expect(projectPromoterInput.safeParse({ ...ok, campaign: "pump" }).success).toBe(false);
  });

  it("request schema requires a known tool", () => {
    expect(generateRequestSchema.safeParse({ tool: "hack", input: {} }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ tool: "cast_writer", input: validCast }).success).toBe(true);
    expect(generateRequestSchema.safeParse(null).success).toBe(false);
  });

  it("sums string input length", () => {
    expect(totalInputLength({ a: "abc", b: "de", c: 5 })).toBe(5);
  });
});

describe("output post-processing", () => {
  it("parses valid promoter JSON, including fenced JSON", () => {
    expect(parsePromoter(promoterJson)?.headlines).toHaveLength(3);
    expect(parsePromoter("```json\n" + promoterJson + "\n```")?.cta).toBe("Try Acme today");
  });

  it("rejects malformed promoter output", () => {
    expect(parsePromoter("not json")).toBeNull();
    expect(parsePromoter(JSON.stringify({ cast: "x" }))).toBeNull();
    const twoHeadlines = JSON.stringify({ cast: "c", description: "d", headlines: ["a", "b"], cta: "x" });
    expect(parsePromoter(twoHeadlines)).toBeNull();
  });

  it("cleans wrapping quotes and caps length", () => {
    expect(cleanText('"Hello world"', 100)).toBe("Hello world");
    expect(cleanText("a".repeat(50), 10)).toHaveLength(10);
  });
});
