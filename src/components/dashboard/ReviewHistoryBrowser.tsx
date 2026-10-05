"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { STATE_LABEL, formatDateTime, timeAgo } from "@/lib/format";
import type { EntryState, POS } from "@/lib/types";
import { PosBadge, StateBadge } from "@/components/ui";

type Row = {
  id: string;
  state: EntryState;
  writtenForm: string;
  pos: POS;
  contributorId: string;
  contributorName: string | null;
  lastUpdatedByName: string | null;
  updatedAt: string;
};

type HistoryResponse = {
  items: Row[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  lastUpdatedAt: string | null;
  availableStates: EntryState[];
};

const PAGE_SIZES = [15, 30, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];

const STATE_ORDER = Object.keys(STATE_LABEL) as EntryState[];

/**
 * Entries whose status the signed-in reviewer changed, with their current state.
 * The backend scopes rows and filterable states by role; `states` is only the initial chip set.
 */
export function ReviewHistoryBrowser({
  states: initialStates,
  initialState,
  initialQuery = "",
}: {
  states: EntryState[];
  initialState?: EntryState;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery.trim());
  const [state, setState] = useState<EntryState | "ALL">(initialState ?? "ALL");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<PageSize>(15);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: HistoryResponse;
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
    return params.toString();
  }, [page, size, q, state]);

  const requestKey = `${query}#${reloadNonce}`;

  useEffect(() => {
    const ctrl = new AbortController();
    const load = (attempt: number): Promise<Response> =>
      fetch(`/api/submissions/history?${query}`, {
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
          const fieldError =
            data.errors && typeof data.errors === "object"
              ? (Object.values(data.errors)[0] as string | undefined)
              : undefined;
          setResult({
            key: requestKey,
            error:
              typeof data.error === "string" ? data.error : (fieldError ?? "Could not load your history."),
          });
          return;
        }
        const body = data as HistoryResponse;
        if (body.totalPages > 0 && body.page >= body.totalPages) {
          setPage(body.totalPages - 1);
          return;
        }
        setResult({ key: requestKey, data: body });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResult({ key: requestKey, error: "Could not load your history." });
      });
    return () => ctrl.abort();
  }, [query, requestKey]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string | null) =>
      v ? url.searchParams.set(k, v) : url.searchParams.delete(k);
    set("q", q || null);
    set("state", state !== "ALL" ? state : null);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [q, state]);

  const loading = result?.key !== requestKey;
  const data = result?.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const error = !loading ? result?.error : undefined;
  const available = data?.availableStates ?? initialStates;
  const chips = STATE_ORDER.filter((s) => available.includes(s));

  const rangeLabel = useMemo(() => {
    if (!totalElements) return "0 entries";
    const from = page * size + 1;
    const to = Math.min((page + 1) * size, totalElements);
    return `${from}–${to} of ${totalElements}`;
  }, [page, size, totalElements]);

  const columns = 6;

  function pickState(next: EntryState | "ALL") {
    setPage(0);
    setState(next);
  }

  function open(id: string) {
    router.push(`/dashboard/submissions/${encodeURIComponent(id)}`);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              {state === "ALL" ? "All entries" : `${STATE_LABEL[state]} entries`}
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
            aria-label="Search your history by word or definition"
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

        <div role="radiogroup" aria-label="Filter by current status" className="flex flex-wrap gap-1.5">
          {(["ALL", ...chips] as const).map((s) => (
            <label key={s} className="cursor-pointer">
              <input
                type="radio"
                name="history-state-filter"
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
      </div>

      {error ? (
        <p className="m-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      <div className="thin-scroll relative overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold">Word</th>
              <th className="px-3 py-3 font-semibold">POS</th>
              <th className="px-3 py-3 font-semibold">State</th>
              <th className="px-3 py-3 font-semibold">Contributor</th>
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
                  {q
                    ? "No entries match your search."
                    : state !== "ALL"
                      ? `No entries you reviewed are currently ${STATE_LABEL[state]}.`
                      : "No decisions yet. Entries appear here once you change their status."}
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr
                  key={s.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a")) return;
                    open(s.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) open(s.id);
                  }}
                  tabIndex={0}
                  aria-label={`Open ${s.writtenForm} (${s.id})`}
                  className="cursor-pointer transition hover:bg-slate-50/70 focus-visible:bg-emerald-50/50 focus-visible:outline-none"
                >
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
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {s.contributorName ?? s.contributorId}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400" title={formatDateTime(s.updatedAt)}>
                    {timeAgo(s.updatedAt)}
                    {s.lastUpdatedByName ? (
                      <span className="block text-[11px] text-slate-400">by {s.lastUpdatedByName}</span>
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
