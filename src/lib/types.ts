import type { ToolId } from "./constants";
import type { PromoterOutput } from "./validation";

export type UsageInfo = {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
};

export type GenerateResponse = {
  id: string | null;
  saved: boolean;
  tool: ToolId;
  output: string;
  outputData: PromoterOutput | null;
  model: string;
  createdAt: string;
  usage: UsageInfo;
};

export type MeResponse = {
  fid: number;
  usage: UsageInfo;
  generationEnabled: boolean;
  providerConfigured: boolean;
};

export type HistorySummary = {
  id: string;
  tool: ToolId;
  title: string;
  preview: string;
  createdAt: string;
};

export type HistoryListResponse = {
  items: HistorySummary[];
  hasMore: boolean;
  page: number;
};

export type HistoryDetail = {
  id: string;
  tool: ToolId;
  title: string;
  inputMeta: Record<string, unknown>;
  output: string;
  outputData: PromoterOutput | null;
  model: string;
  createdAt: string;
};

export type ApiErrorBody = {
  error: { code: string; message: string; details?: Record<string, string> };
};
