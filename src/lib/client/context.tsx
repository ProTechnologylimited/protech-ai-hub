"use client";

import { createContext, useContext } from "react";
import type { UsageInfo } from "../types";

export type AppState = {
  usage: UsageInfo | null;
  setUsage: (usage: UsageInfo) => void;
  generationEnabled: boolean;
  providerConfigured: boolean;
};

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppContext");
  return ctx;
}
