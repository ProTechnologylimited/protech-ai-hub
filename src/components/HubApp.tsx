"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { ApiError, detectMiniApp, devAuthAvailable, errorMessage, request } from "@/lib/client/api";
import { AppContext, type AppState } from "@/lib/client/context";
import type { MeResponse, UsageInfo } from "@/lib/types";
import { Brand } from "./Brand";
import { CastWriter } from "./CastWriter";
import { History } from "./History";
import { ProjectPromoter } from "./ProjectPromoter";
import { ReplyAssistant } from "./ReplyAssistant";
import { Button, Card, ErrorNote, Spinner, cx } from "./ui";

type Tab = "home" | "cast" | "reply" | "promote" | "history";

type Session =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; me: MeResponse };

const ICONS: Record<Tab, string> = {
  home: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  cast: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  reply: "M9 17l-5-5 5-5M20 18v-2a4 4 0 0 0-4-4H4",
  promote: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8",
  history: "M12 8v5l3 2M21 12a9 9 0 1 1-3-6.7M21 4v5h-5",
};

function Icon({ tab, className }: { tab: Tab; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx("h-5 w-5", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[tab]} />
    </svg>
  );
}

const NAV: Array<{ tab: Tab; label: string }> = [
  { tab: "home", label: "Home" },
  { tab: "cast", label: "Cast" },
  { tab: "reply", label: "Reply" },
  { tab: "promote", label: "Promote" },
  { tab: "history", label: "History" },
];

const TOOL_CARDS: Array<{ tab: Exclude<Tab, "home" | "history">; name: string; body: string }> = [
  { tab: "cast", name: "Cast Writer", body: "Turn an idea into a cast draft with the objective, tone and length you choose." },
  { tab: "reply", name: "Reply Assistant", body: "Paste a public post and draft a thoughtful reply in your own direction." },
  { tab: "promote", name: "Project Promoter", body: "Get a cast, description, headlines and a call to action from your project facts." },
];

function UsageMeter({ usage }: { usage: UsageInfo | null }) {
  if (!usage) return null;
  const pct = usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 100;
  return (
    <div className="text-right" aria-label={`${usage.remaining} of ${usage.limit} generations left today`}>
      <p className="text-xs font-semibold tabular-nums">
        {usage.remaining} of {usage.limit} left today
      </p>
      <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-violet to-azure" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SignedOut() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Brand />
      <h1 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight">Open this app in Farcaster</h1>
      <p className="mt-3 text-muted">
        Protech AI Hub signs you in with your Farcaster account, so it only works inside a Farcaster client that
        supports Mini Apps.
      </p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-muted">
        <li>Open a Farcaster client on your phone.</li>
        <li>Open Protech AI Hub from a shared link or from the Mini Apps list.</li>
      </ol>
      <p className="mt-8 text-xs text-muted">
        Developers: set DEV_AUTH_ENABLED and NEXT_PUBLIC_DEV_AUTH to preview in a browser during local development.
      </p>
    </main>
  );
}

export function HubApp() {
  const [session, setSession] = useState<Session>({ status: "loading" });
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [name, setName] = useState<string | null>(null);

  const boot = useCallback(async () => {
    setSession({ status: "loading" });
    const inMiniApp = await detectMiniApp();

    if (inMiniApp) {
      try {
        // Cosmetic only: this client-provided name is never sent to or trusted by the server.
        const ctx = await sdk.context;
        setName(ctx?.user?.displayName ?? ctx?.user?.username ?? null);
      } catch {
        // ignore
      }
    }

    if (!inMiniApp && !devAuthAvailable()) {
      setSession({ status: "signed_out" });
      return;
    }

    try {
      const me = await request<MeResponse>("/api/me");
      setUsage(me.usage);
      setSession({ status: "ready", me });
    } catch (err) {
      if (err instanceof ApiError && err.code === "not_in_miniapp") {
        setSession({ status: "signed_out" });
      } else {
        setSession({ status: "error", message: errorMessage(err) });
      }
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  // Tell the Farcaster client the UI is ready so it hides the splash screen.
  useEffect(() => {
    (async () => {
      if (await detectMiniApp()) {
        try {
          await sdk.actions.ready();
        } catch {
          // ready() failing must not break the app
        }
      }
    })();
  }, []);

  const state = useMemo<AppState>(
    () => ({
      usage,
      setUsage,
      generationEnabled: session.status === "ready" ? session.me.generationEnabled : false,
      providerConfigured: session.status === "ready" ? session.me.providerConfigured : false,
    }),
    [usage, session]
  );

  if (session.status === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center" role="status">
        <Spinner className="h-6 w-6 text-violet-soft" />
        <span className="sr-only">Loading Protech AI Hub</span>
      </main>
    );
  }

  if (session.status === "signed_out") return <SignedOut />;

  if (session.status === "error") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
        <Brand />
        <h1 className="text-2xl font-extrabold tracking-tight">We could not sign you in</h1>
        <ErrorNote message={session.message} />
        <Button variant="primary" onClick={() => void boot()}>
          Try again
        </Button>
      </main>
    );
  }

  return (
    <AppContext.Provider value={state}>
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
        <header className="flex items-center justify-between px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <Brand />
          <UsageMeter usage={usage} />
        </header>

        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mx-5 md:mb-2 md:rounded-2xl md:border md:bg-panel"
        >
          <ul className="mx-auto flex max-w-xl justify-between px-2 py-1.5 md:px-1.5">
            {NAV.map((n) => {
              const active = tab === n.tab;
              return (
                <li key={n.tab} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setTab(n.tab)}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition md:flex-row md:gap-2 md:text-sm",
                      active ? "bg-raised text-violet-soft" : "text-muted hover:text-fg"
                    )}
                  >
                    <Icon tab={n.tab} />
                    {n.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex-1 px-5 pb-28 pt-4 md:pb-10">
          {tab === "home" ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
                  {name ? `Welcome, ${name}` : "Welcome back"}
                </h1>
                <p className="mt-1.5 text-muted">Create Smarter. Build Faster.</p>
              </div>

              <ul className="space-y-3">
                {TOOL_CARDS.map((card) => (
                  <li key={card.tab}>
                    <button
                      type="button"
                      onClick={() => setTab(card.tab)}
                      className="flex w-full items-start gap-4 rounded-card border border-line bg-panel p-4 text-left transition hover:border-violet"
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-raised text-violet-soft">
                        <Icon tab={card.tab} />
                      </span>
                      <span>
                        <span className="block text-base font-bold">{card.name}</span>
                        <span className="mt-0.5 block text-sm text-muted">{card.body}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <Card className="text-sm text-muted">
                <p>
                  Everything here is an AI draft for you to review. Drafts are saved to your history, and your daily
                  allowance resets at 00:00 UTC.
                </p>
                <p className="mt-2">
                  <Link href="/privacy" className="text-violet-soft underline underline-offset-4">
                    How your data is stored and processed
                  </Link>
                </p>
              </Card>
              <p className="text-center text-xs text-muted">ProTechnology Limited</p>
            </div>
          ) : null}

          {tab === "cast" ? <CastWriter /> : null}
          {tab === "reply" ? <ReplyAssistant /> : null}
          {tab === "promote" ? <ProjectPromoter /> : null}
          {tab === "history" ? (
            <History
              onGoTo={(t) => {
                setTab(t);
              }}
            />
          ) : null}
        </main>
      </div>
    </AppContext.Provider>
  );
}
