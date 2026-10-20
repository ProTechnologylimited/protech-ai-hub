"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import type { ApiErrorBody } from "../types";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === "true";

let miniAppCheck: Promise<boolean> | null = null;

/** True when running inside a Farcaster client. */
export function detectMiniApp(): Promise<boolean> {
  if (!miniAppCheck) {
    miniAppCheck = (async () => {
      try {
        return await sdk.isInMiniApp();
      } catch {
        return false;
      }
    })();
  }
  return miniAppCheck;
}

export function devAuthAvailable(): boolean {
  return DEV_AUTH;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (await detectMiniApp()) {
    // Adds "Authorization: Bearer <Quick Auth token>" and fetches a token if needed.
    return sdk.quickAuth.fetch(path, init);
  }
  if (DEV_AUTH) {
    // Development only. The server ignores this header in production builds.
    const headers = new Headers(init.headers);
    headers.set("x-dev-fid", process.env.NEXT_PUBLIC_DEV_FID || "1");
    return fetch(path, { ...init, headers });
  }
  throw new ApiError("not_in_miniapp", "Open this app inside a Farcaster client to sign in.", 401);
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await authedFetch(path, init);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("network_error", "Could not reach the server. Check your connection and try again.", 0);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // fall through
  }

  if (!res.ok) {
    const body = data as ApiErrorBody | null;
    throw new ApiError(
      body?.error?.code ?? "request_failed",
      body?.error?.message ?? "The request failed. Try again.",
      res.status,
      body?.error?.details
    );
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}
