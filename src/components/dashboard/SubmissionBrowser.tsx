"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { STATE_LABEL, formatDateTime, timeAgo } from "@/lib/format";
import type { EntryState, POS } from "@/lib/types";
import { PosBadge, StateBadge } from "@/components/ui";

/**
 * - manage: Platform Architect / System Moderator, every state, radio status filter.
 * - review: Lexical Editor / Chief Lexical Editor, one fixed state, "Assigned to me" toggle.
 * - mine:   My Submissions, the caller's own entries, radio status filter.
 */
export type BrowserMode = "manage" | "review" | "mine";

type Row = {
  id: string;
  state: EntryState;
  writtenForm: string;
  pos: POS;
  synsetAction: "link" | "create";
  synsetId: string | null;
  iliCode: string | null;
  contributorId: string;
  contributorName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  lastUpdatedBy: string | null;
  lastUpdatedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

type BrowseResponse = {
  items: Row[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  lastUpdatedAt: string | null;
};

const PAGE_SIZES = [15, 30, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];

const ALL_STATES = Object.keys(STATE_LABEL) as EntryState[];

export function SubmissionBrowser({
  mode,
  fixedState,
  initialState,
  initialAssignedToMe = false,
  initialQuery = "",
  emptyMessage = "Nothing here yet.",
}: {
  mode: BrowserMode;
  fixedState?: EntryState;
  initialState?: EntryState;
  initialAssignedToMe?: boolean;
  initialQuery?: string;
  emptyMessage?: string;
}) {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery.trim());
  const [state, setState] = useState<EntryState | "ALL">(
    mode === "review" ? (fixedState ?? "ALL") : (initialState ?? "ALL")
  );
  const [assignedToMe, setAssignedToMe] = useState(mode === "review" && initialAssignedToMe);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<PageSize>(15);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: BrowseResponse;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const next = searchInput.trim();
    if (next === q) return;
    const id = window.setTimeout(() => {
      setPage(0);
      setQ(next);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput, q]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (q) params.set("q", q);
    if (state !== "ALL") params.set("state", state);
    if (mode === "review" && assignedToMe) params.set("assignedTo", "me");
    if (mode === "mine") params.set("contributorId", "me");
    return params.toString();
  }, [page, size, q, state, assignedToMe, mode]);

  const requestKey = `${query}#${reloadNonce}`;

  useEffect(() => {
    const ctrl = new AbortController();
    const load = (attempt: number): Promise<Response> =>
      fetch(`/api/submissions?${query}`, {
        credentials: "include",
        cache: "no-store",
        signal: ctrl.signal,
      }).then(
        (res) => (res.status >= 500 && attempt === 0 ? retry() : res),
        (err: unknown) => {
          if (attempt > 0 || (err instanceof DOMException && err.name === "AbortError")) throw err;
          return retry();
        }
      );
    // One quiet retry covers transient failures (e.g. dev-server recompiles, backend restart blips).
    const retry = () =>
      new Promise<Response>((resolve, reject) => {
        const id = window.setTimeout(() => load(1).then(resolve, reject), 400);
        ctrl.signal.addEventListener("abort", () => {
          window.clearTimeout(id);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    load(0)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setResult({
            key: requestKey,
            error: typeof data.error === "string" ? data.error : "Could not load submissions.",
          });
          return;
        }
        const body = data as BrowseResponse;
        // Entries can leave this view (reviewed elsewhere) and empty the current page.
        if (body.totalPages > 0 && body.page >= body.totalPages) {
          setPage(body.totalPages - 1);
          return;
        }
        setResult({ key: requestKey, data: body });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResult({ key: requestKey, error: "Could not load submissions." });
      });
    return () => ctrl.abort();
  }, [query, requestKey]);

  // Keep filters shareable and back-button friendly without re-rendering the server page.
  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string | null) =>
      v ? url.searchParams.set(k, v) : url.searchParams.delete(k);
    set("q", q || null);
    set("state", mode !== "review" && state !== "ALL" ? state : null);
    set("assigned", mode === "review" && assignedToMe ? "me" : null);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [q, state, assignedToMe, mode]);

  const loading = result?.key !== requestKey;
  const data = result?.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const error = !loading ? result?.error : undefined;

  const rangeLabel = useMemo(() => {
    if (!totalElements) return "0 entries";
    const from = page * size + 1;
    const to = Math.min((page + 1) * size, totalElements);
    return `${from}–${to} of ${totalElements}`;
  }, [page, size, totalElements]);

  const showContributor = mode !== "mine";
  const showAssigned = mode !== "mine";
  const columns = 5 + (showContributor ? 1 : 0) + (showAssigned ? 1 : 0);

  function pickState(next: EntryState | "ALL") {
    setPage(0);
    setState(next);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              {mode === "review" && fixedState
                ? `${STATE_LABEL[fixedState]} entries`
                : state === "ALL"
                  ? "All entries"
                  : `${STATE_LABEL[state]} entries`}
            </h2>
            <p className="text-xs text-slate-500">
              {rangeLabel}
              {data?.lastUpdatedAt ? (
                <span title={formatDateTime(data.lastUpdatedAt)}>
                  {" "}
                  · last updated {timeAgo(data.lastUpdatedAt)}
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        <div className="relative">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by Bengali word or definition…"
            aria-label="Search submissions by word or definition"
            maxLength={100}
            className="font-bengali w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-9 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded px-1.5 text-sm text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          ) : null}
        </div>

        {mode === "review" ? (
          <div role="radiogroup" aria-label="Queue scope" className="flex gap-1.5">
            {[
              { value: false, label: "Full queue" },
              { value: true, label: "Assigned to me" },
            ].map((opt) => (
              <label key={opt.label} className="cursor-pointer">
                <input
                  type="radio"
                  name="queue-scope"
                  className="peer sr-only"
                  checked={assignedToMe === opt.value}
                  onChange={() => {
                    setPage(0);
                    setAssignedToMe(opt.value);
                  }}
                />
                <span className="inline-block rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 transition peer-checked:bg-slate-800 peer-checked:text-white peer-checked:ring-slate-800 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 hover:bg-slate-50 peer-checked:hover:bg-slate-800">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div role="radiogroup" aria-label="Filter by state" className="flex flex-wrap gap-1.5">
            {(["ALL", ...ALL_STATES] as const).map((s) => (
              <label key={s} className="cursor-pointer">
                <input
                  type="radio"
                  name="state-filter"
                  className="peer sr-only"
                  checked={state === s}
                  onChange={() => pickState(s)}
                />
                <span className="inline-block rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 transition peer-checked:bg-slate-800 peer-checked:text-white peer-checked:ring-slate-800 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 hover:bg-slate-50 peer-checked:hover:bg-slate-800">
                  {s === "ALL" ? "All states" : STATE_LABEL[s]}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {mode === "manage" && state === "UNDER_REVIEW" ? (
        <div className="mx-5 mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          These entries were held by the anti-bot system. Open an entry and use “Clear
          Anti-Bot Hold” to release it into PENDING_REVIEW.
        </div>
      ) : null}

      {error ? (
        <p className="m-5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold">Word</th>
              <th className="px-3 py-3 font-semibold">POS</th>
              <th className="px-3 py-3 font-semibold">State</th>
              {showContributor ? <th className="px-3 py-3 font-semibold">Contributor</th> : null}
              {showAssigned ? <th className="px-3 py-3 font-semibold">Assigned</th> : null}
              <th className="px-3 py-3 font-semibold">Last updated</th>
              <th className="px-5 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y divide-slate-50 transition-opacity ${loading && data ? "opacity-50" : ""}`}
          >
            {loading && !data ? (
              <tr>
                <td colSpan={columns} className="px-5 py-8 text-center text-sm text-slate-400">
                  Loading entries…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns} className="px-5 py-8 text-center text-sm italic text-slate-400">
                  {q ? "No entries match your search." : emptyMessage}
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr key={s.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/submissions/${s.id}`}
                      className="font-bengali text-base font-semibold text-slate-800 hover:text-emerald-700"
                    >
                      {s.writtenForm}
                    </Link>
                    <span className="ml-2 font-mono text-[10px] text-slate-300">{s.id}</span>
                  </td>
                  <td className="px-3 py-3">
                    <PosBadge pos={s.pos} full={false} />
                  </td>
                  <td className="px-3 py-3">
                    <StateBadge state={s.state} />
                  </td>
                  {showContributor ? (
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {s.contributorName ?? s.contributorId}
                    </td>
                  ) : null}
                  {showAssigned ? (
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {s.assignedTo ? (
                        (s.assignedToName ?? s.assignedTo)
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-3 py-3 text-xs text-slate-400" title={formatDateTime(s.updatedAt)}>
                    {timeAgo(s.updatedAt)}
                    {s.lastUpdatedByName ? (
                      <span className="block text-[11px] text-slate-400">
                        by {s.lastUpdatedByName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/dashboard/submissions/${s.id}`}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          disabled={page <= 0 || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 disabled:opacity-40"
        >
          Previous
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Page {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Rows
            <select
              value={size}
              onChange={(e) => {
                setPage(0);
                setSize(Number(e.target.value) as PageSize);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-emerald-500"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={page + 1 >= totalPages || loading}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}
