"use client";

import { useCallback, useRef, useState } from "react";
import type { ToolId } from "../constants";
import type { GenerateResponse } from "../types";
import { ApiError, errorMessage, request } from "./api";
import { useApp } from "./context";

export function useGenerate(tool: ToolId) {
  const { setUsage, generationEnabled, providerConfigured } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(false);

  const run = useCallback(
    async (input: unknown): Promise<GenerateResponse | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setLoading(true);
      setError(null);
      setFieldErrors({});
      try {
        const res = await request<GenerateResponse>("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tool, input }),
        });
        setUsage(res.usage);
        return res;
      } catch (err) {
        setError(errorMessage(err));
        if (err instanceof ApiError && err.details) setFieldErrors(err.details);
        return null;
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [tool, setUsage]
  );

  return {
    run,
    loading,
    error,
    setError,
    fieldErrors,
    setFieldErrors,
    blockedReason: !generationEnabled
      ? "AI generation is temporarily turned off."
      : !providerConfigured
        ? "AI generation is not configured on the server yet."
        : null,
  };
}
