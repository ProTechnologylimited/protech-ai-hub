"use client";

import type { ReactNode } from "react";
import { CAST_MAX_CHARS } from "@/lib/constants";
import type { PromoterOutput } from "@/lib/validation";
import { CharRing, CopyButton } from "./ui";

type Props = {
  value: PromoterOutput;
  /** When omitted, the draft is read-only (used for saved history). */
  onChange?: (next: PromoterOutput) => void;
};

const areaClass =
  "w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-[15px] leading-relaxed text-fg focus:border-violet read-only:text-fg/90";

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <CopyButton text={text} className="min-h-9 px-3 text-xs" />
      </div>
      {children}
    </div>
  );
}

export function PromoterDraft({ value, onChange }: Props) {
  const readOnly = !onChange;
  const set = (patch: Partial<PromoterOutput>) => onChange?.({ ...value, ...patch });

  const all = [
    "Promotional cast:",
    value.cast,
    "",
    "Short project description:",
    value.description,
    "",
    "Alternative headlines:",
    ...value.headlines.map((h, i) => `${i + 1}. ${h}`),
    "",
    "Call to action:",
    value.cta,
  ].join("\n");

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-violet/40 bg-violet/10 px-3.5 py-2.5 text-sm text-violet-soft">
        Draft. Review every claim and edit before you publish.
      </p>

      <Section title="Promotional cast" text={value.cast}>
        <textarea
          aria-label="Promotional cast"
          className={areaClass}
          rows={5}
          value={value.cast}
          readOnly={readOnly}
          onChange={(e) => set({ cast: e.target.value })}
        />
        <CharRing count={value.cast.length} max={CAST_MAX_CHARS} />
      </Section>

      <Section title="Short project description" text={value.description}>
        <textarea
          aria-label="Short project description"
          className={areaClass}
          rows={3}
          value={value.description}
          readOnly={readOnly}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Section>

      <Section title="Alternative headlines" text={value.headlines.join("\n")}>
        <div className="space-y-2">
          {value.headlines.map((h, i) => (
            <input
              key={i}
              aria-label={`Headline ${i + 1}`}
              className={areaClass}
              value={h}
              readOnly={readOnly}
              onChange={(e) => set({ headlines: value.headlines.map((x, j) => (j === i ? e.target.value : x)) })}
            />
          ))}
        </div>
      </Section>

      <Section title="Call to action" text={value.cta}>
        <input
          aria-label="Call to action"
          className={areaClass}
          value={value.cta}
          readOnly={readOnly}
          onChange={(e) => set({ cta: e.target.value })}
        />
      </Section>

      <CopyButton text={all} label="Copy everything" className="w-full" />
    </div>
  );
}
