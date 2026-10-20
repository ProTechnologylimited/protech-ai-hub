import type { ToolId } from "./constants";
import type { PromoterOutput } from "./validation";

export type SaveGenerationInput = {
  userId: string;
  tool: ToolId;
  title: string;
  inputMeta: Record<string, unknown>;
  output: string;
  outputData: PromoterOutput | null;
  model: string;
};

export type GenerationRecord = {
  id: string;
  tool: ToolId;
  title: string;
  inputMeta: Record<string, unknown>;
  output: string;
  outputData: PromoterOutput | null;
  model: string;
  createdAt: string;
};

export type GenerationSummary = {
  id: string;
  tool: ToolId;
  title: string;
  preview: string;
  createdAt: string;
};

/** Persistence contract. Every history method is scoped by userId. */
export interface Store {
  upsertUser(fid: number): Promise<{ id: string }>;
  getUsage(userId: string, date: string): Promise<number>;
  /** Atomically reserves one generation. ok=false when the daily limit is reached. */
  reserveUsage(userId: string, date: string, limit: number): Promise<{ ok: boolean; used: number }>;
  releaseUsage(userId: string, date: string): Promise<void>;
  saveGeneration(input: SaveGenerationInput, maxPerUser: number): Promise<{ id: string; createdAt: string }>;
  listGenerations(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ items: GenerationSummary[]; hasMore: boolean }>;
  getGeneration(userId: string, id: string): Promise<GenerationRecord | null>;
  deleteGeneration(userId: string, id: string): Promise<boolean>;
}
