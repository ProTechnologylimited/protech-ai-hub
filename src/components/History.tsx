"use client";

import { useCallback, useEffect, useState } from "react";
import { TOOL_NAMES } from "@/lib/constants";
import { errorMessage, request } from "@/lib/client/api";
import type { HistoryDetail, HistoryListResponse, HistorySummary } from "@/lib/types";
import { PromoterDraft } from "./PromoterDraft";
import { Button, Card, CopyButton, EmptyState, ErrorNote, Spinner } from "./ui";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function History({ onGoTo }: { onGoTo: (tab: "cast" | "reply" | "promote") => void }) {
  const [items, setItems] = useState<HistorySummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<HistoryDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await request<HistoryListResponse>(`/api/history?page=${nextPage}`);
      setItems((prev) => (nextPage === 0 ? res.items : [...prev, ...res.items]));
      setHasMore(res.hasMore);
      setPage(nextPage);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load]);

  async function openItem(id: string) {
    setOpening(id);
    setError(null);
    try {
      setOpen(await request<HistoryDetail>(`/api/history/${id}`));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setOpening(null);
    }
  }

  async function removeItem(id: string) {
    setDeleting(id);
    setError(null);
    try {
      await request<{ deleted: boolean }>(`/api/history/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      setConfirmId(null);
      if (open?.id === id) setOpen(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  }

  if (open) {
    return (
      <Card>
        <Button variant="ghost" className="-ml-3" onClick={() => setOpen(null)}>
          Back to history
        </Button>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight">{open.title}</h2>
        <p className="mt-1 text-xs text-muted">
          {TOOL_NAMES[open.tool]} on {formatDate(open.createdAt)}
        </p>
        <div className="mt-5">
          {open.tool === "project_promoter" && open.outputData ? (
            <PromoterDraft value={open.outputData} />
          ) : (
            <>
              <label htmlFor="saved-output" className="mb-1.5 block text-sm font-semibold">
                Saved result
              </label>
              <textarea
                id="saved-output"
                readOnly
                rows={8}
                value={open.output}
                className="w-full rounded-xl border border-line bg-ink px-3.5 py-3 text-[15px] leading-relaxed text-fg"
              />
              <CopyButton text={open.output} className="mt-3 w-full" />
            </>
          )}
        </div>
        <div className="mt-6 border-t border-line pt-4">
          <ErrorNote message={error} />
          {confirmId === open.id ? (
            <div className="flex gap-2.5">
              <Button variant="danger" className="flex-1" loading={deleting === open.id} onClick={() => removeItem(open.id)}>
                Confirm delete
              </Button>
              <Button className="flex-1" onClick={() => setConfirmId(null)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="danger" className="w-full" onClick={() => setConfirmId(open.id)}>
              Delete this result
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">History</h2>
        <p className="mt-1 text-sm text-muted">Your saved drafts. Only you can see them.</p>
      </div>

      <ErrorNote message={error} />

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted" role="status">
          <Spinner /> Loading your history
        </div>
      ) : items.length === 0 && !error ? (
        <EmptyState
          title="Nothing saved yet"
          body="Drafts you generate are saved here so you can copy them again later."
          action={
            <Button variant="primary" onClick={() => onGoTo("cast")}>
              Write a cast
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-card border border-line bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {TOOL_NAMES[item.tool]} on {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{item.preview}</p>
              <div className="mt-3 flex gap-2.5">
                <Button className="flex-1" onClick={() => openItem(item.id)} loading={opening === item.id}>
                  Open
                </Button>
                {confirmId === item.id ? (
                  <>
                    <Button variant="danger" loading={deleting === item.id} onClick={() => removeItem(item.id)}>
                      Confirm
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmId(null)}>
                      Keep
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={() => setConfirmId(item.id)} aria-label={`Delete ${item.title}`}>
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <Button className="w-full" loading={loading} onClick={() => load(page + 1)}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}
