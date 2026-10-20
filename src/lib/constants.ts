// Shared by server and client. No secrets, no Node-only imports.

export const CAST_MAX_CHARS = 320;

export const OBJECTIVE_VALUES = [
  "share_update",
  "announce_project",
  "educate",
  "ask_question",
  "promote_product",
  "personal_insight",
] as const;
export type ObjectiveValue = (typeof OBJECTIVE_VALUES)[number];
export const OBJECTIVE_LABELS: Record<ObjectiveValue, string> = {
  share_update: "Share an update",
  announce_project: "Announce a project",
  educate: "Educate the community",
  ask_question: "Ask an engaging question",
  promote_product: "Promote a product",
  personal_insight: "Share a personal insight",
};

export const TONE_VALUES = [
  "professional",
  "friendly",
  "educational",
  "exciting",
  "conversational",
  "thought_provoking",
] as const;
export type ToneValue = (typeof TONE_VALUES)[number];
export const TONE_LABELS: Record<ToneValue, string> = {
  professional: "Professional",
  friendly: "Friendly",
  educational: "Educational",
  exciting: "Exciting",
  conversational: "Conversational",
  thought_provoking: "Thought-provoking",
};

export const LENGTH_VALUES = ["short", "medium", "long"] as const;
export type LengthValue = (typeof LENGTH_VALUES)[number];
export const LENGTH_LABELS: Record<LengthValue, string> = {
  short: "Short (up to about 140 characters)",
  medium: "Medium (up to about 240 characters)",
  long: "Long (up to 320 characters)",
};
export const LENGTH_TARGETS: Record<LengthValue, number> = {
  short: 140,
  medium: 240,
  long: 320,
};

export const CAMPAIGN_VALUES = ["awareness", "launch", "feedback", "visits", "community"] as const;
export type CampaignValue = (typeof CAMPAIGN_VALUES)[number];
export const CAMPAIGN_LABELS: Record<CampaignValue, string> = {
  awareness: "Build awareness",
  launch: "Announce a launch",
  feedback: "Gather feedback",
  visits: "Drive visits or sign-ups",
  community: "Grow a community",
};

export const TOOL_IDS = ["cast_writer", "reply_assistant", "project_promoter"] as const;
export type ToolId = (typeof TOOL_IDS)[number];
export const TOOL_NAMES: Record<ToolId, string> = {
  cast_writer: "Cast Writer",
  reply_assistant: "Reply Assistant",
  project_promoter: "Project Promoter",
};

export function optionsFrom<T extends string>(values: readonly T[], labels: Record<T, string>) {
  return values.map((value) => ({ value, label: labels[value] }));
}
