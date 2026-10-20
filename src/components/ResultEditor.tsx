"use client";

import { useState } from "react";
import { CAST_MAX_CHARS } from "@/lib/constants";
import { shareToFarcaster } from "@/lib/client/share";
import { Button, CharRing, CopyButton, InfoNote } from "./ui";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  onClear: () => void;
  busy: boolean;
  canRegenerate: boolean;
  saved: boolean;
};

/** Editable generated text with count, copy, share, regenerate and clear controls. */
export function ResultEditor({ label, value, onChange, onRegenerate, onClear, busy, canRegenerate, saved }: Props) {
  const [shareNote, setShareNote] = useState<string | null>(null);

  async function onShare() {
    const res = await shareToFarcaster(value);
    setShareNote(res.ok ? null : (res.message ?? null));
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor="result-editor" className="text-sm font-semibold">
          {label}
        </label>
        <CharRing count={value.length} max={CAST_MAX_CHARS} />
      </div>
      <textarea
        id="result-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={7}
        className="w-full rounded-xl border border-line bg-ink px-3.5 py-3 text-[15px] leading-relaxed text-fg focus:border-violet"
      />
      <p className="mt-1.5 text-xs text-muted">
        AI draft. Review and edit before you post.{" "}
        {saved ? "Saved to your history." : "This result could not be saved to your history."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <CopyButton text={value} />
        <Button onClick={onShare} disabled={!value.trim()}>
          Share
        </Button>
        <Button onClick={onRegenerate} disabled={!canRegenerate || busy} loading={busy}>
          Regenerate
        </Button>
        <Button variant="ghost" onClick={onClear} disabled={busy}>
          Clear
        </Button>
      </div>
      {shareNote ? (
        <div className="mt-3">
          <InfoNote>{shareNote}</InfoNote>
        </div>
      ) : null}
    </div>
  );
}
