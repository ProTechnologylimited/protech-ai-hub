"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { detectMiniApp } from "./api";

/** Opens the Farcaster composer with a draft. The user still reviews and posts it themselves. */
export async function shareToFarcaster(text: string): Promise<{ ok: boolean; message?: string }> {
  if (!(await detectMiniApp())) {
    return { ok: false, message: "Sharing works inside a Farcaster client. Copy the text instead." };
  }
  try {
    await sdk.actions.composeCast({ text });
    return { ok: true };
  } catch {
    return { ok: false, message: "This client does not support sharing from here. Copy the text instead." };
  }
}
