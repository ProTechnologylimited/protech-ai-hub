import { z } from "zod";
import {
  CAMPAIGN_VALUES,
  LENGTH_VALUES,
  OBJECTIVE_VALUES,
  TONE_VALUES,
} from "./constants";

const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, { errorMap: () => ({ message: "Choose one of the listed options." }) });

const required = (label: string, max: number) =>
  z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} must be text.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const optional = (label: string, max: number) =>
  z
    .string({ invalid_type_error: `${label} must be text.` })
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const castWriterInput = z
  .object({
    topic: required("Topic or idea", 500),
    objective: choice(OBJECTIVE_VALUES),
    tone: choice(TONE_VALUES),
    length: choice(LENGTH_VALUES),
    keywords: optional("Keywords", 200),
  })
  .strict();

export const replyAssistantInput = z
  .object({
    original: required("Original post", 1500),
    response: required("Desired response", 500),
    tone: choice(TONE_VALUES),
    context: optional("Context", 500),
  })
  .strict();

export const projectPromoterInput = z
  .object({
    projectName: required("Project name", 80),
    description: required("Project description", 800),
    audience: required("Target audience", 300),
    offering: required("Main product or service", 300),
    campaign: choice(CAMPAIGN_VALUES),
    tone: choice(TONE_VALUES),
  })
  .strict();

export const generateRequestSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("cast_writer"), input: castWriterInput }).strict(),
  z.object({ tool: z.literal("reply_assistant"), input: replyAssistantInput }).strict(),
  z.object({ tool: z.literal("project_promoter"), input: projectPromoterInput }).strict(),
]);

export type CastWriterInput = z.infer<typeof castWriterInput>;
export type ReplyAssistantInput = z.infer<typeof replyAssistantInput>;
export type ProjectPromoterInput = z.infer<typeof projectPromoterInput>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const promoterOutputSchema = z.object({
  cast: z.string().trim().min(1).max(1000),
  description: z.string().trim().min(1).max(500),
  headlines: z.array(z.string().trim().min(1).max(160)).length(3),
  cta: z.string().trim().min(1).max(200),
});
export type PromoterOutput = z.infer<typeof promoterOutputSchema>;

/** Flatten zod issues into { "field": "message" } (first message per field). */
export function formatIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const parts = issue.path.filter((p) => p !== "input");
    const key = parts.length ? parts.join(".") : "request";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Total number of characters across string fields (used for the input cap). */
export function totalInputLength(input: Record<string, unknown>): number {
  let total = 0;
  for (const value of Object.values(input)) {
    if (typeof value === "string") total += value.length;
  }
  return total;
}
