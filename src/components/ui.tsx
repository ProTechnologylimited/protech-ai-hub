"use client";

import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { copyText } from "@/lib/client/clipboard";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({ variant = "secondary", loading, disabled, className, children, ...rest }: ButtonProps) {
  const styles = {
    primary: "bg-gradient-to-r from-violet to-azure text-ink font-bold hover:brightness-110",
    secondary: "border border-line bg-raised text-fg hover:border-violet",
    ghost: "text-muted hover:text-fg",
    danger: "border border-danger/50 text-danger hover:bg-danger/10",
  }[variant];
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className
      )}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

const controlClass =
  "w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-[15px] text-fg placeholder:text-muted/70 focus:border-violet";

type FieldShellProps = { label: string; hint?: string; error?: string; id: string; children: ReactNode };

function FieldShell({ label, hint, error, id, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
};

export function TextField({ label, value, onChange, error, hint, placeholder, maxLength, rows }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const common = {
    id,
    value,
    placeholder,
    maxLength,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: cx(controlClass, error && "border-danger"),
  } as const;
  return (
    <FieldShell label={label} hint={hint} error={error} id={id}>
      {rows ? (
        <textarea {...common} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type="text" onChange={(e) => onChange(e.target.value)} />
      )}
    </FieldShell>
  );
}

type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  error?: string;
};

export function SelectField<T extends string>({ label, value, onChange, options, error }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} id={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cx(controlClass, "appearance-none pr-9")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A9A7C9' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.8rem center",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-raised px-3.5 py-3 text-sm text-muted" role="status">
      {children}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line px-6 py-10 text-center">
      <p className="text-base font-bold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-card border border-line bg-panel p-5", className)}>{children}</section>;
}

/** Circular character counter: fills toward the limit, turns red when over. */
export function CharRing({ count, max }: { count: number; max: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const over = count > max;
  const pct = Math.min(1, count / max);
  const remaining = max - count;
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r={r} fill="none" stroke="#2D2B52" strokeWidth="3" />
        <circle
          cx="14"
          cy="14"
          r={r}
          fill="none"
          stroke={over ? "#FF8A98" : pct > 0.9 ? "#B3A0FF" : "#4C8DFF"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 14 14)"
        />
      </svg>
      <span className={cx("text-sm tabular-nums", over ? "text-danger" : "text-muted")}>
        {count} / {max}
        <span className="sr-only">{over ? `, ${-remaining} characters over the limit` : `, ${remaining} remaining`}</span>
      </span>
    </div>
  );
}

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function onCopy() {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 1800);
  }
  return (
    <Button variant="secondary" onClick={onCopy} disabled={!text.trim()} className={className}>
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </Button>
  );
}
