"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PosBadge } from "@/components/ui";
import {
  countdown,
  formatDhaka,
  ORIGIN_LABEL,
  outcomeLabel,
  PHASE_LABEL,
  reviewerTitle,
  STATUS_LABEL,
  STATUS_STYLE,
  type CaseListResponse,
  type CasePhase,
  type CaseRow,
} from "@/lib/arbitration";
import { nowMs, STATE_LABEL } from "@/lib/format";

export type ArbitrationViewer = "curator" | "manager" | "contributor" | "reviewer";

const PAGE_SIZES = [15, 30, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];
const PHASES: CasePhase[] = ["OPEN", "RESPONSE_WINDOW", "ACTIVE", "TIE_PENDING", "RESOLVED", "ALL"];
const TILES: { phase: CasePhase; label: string; tone: string }[] = [
  { phase: "RESPONSE_WINDOW", label: "Response window", tone: "text-sky-200" },
  { phase: "ACTIVE", label: "Active for voting", tone: "text-violet-200" },
  { phase: "TIE_PENDING", label: "Tied", tone: "text-amber-200" },
  { phase: "RESOLVED", label: "Resolved", tone: "text-slate-300" },
];

export function ArbitrationBrowser({
  viewer,
  initialQuery = "",
  initialPhase = "OPEN",
}: {
  viewer: ArbitrationViewer;
  initialQuery?: string;
  initialPhase?: CasePhase;
}) {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery.trim());
  const [phase, setPhase] = useState<CasePhase>(initialPhase);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<PageSize>(15);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: CaseListResponse; error?: string } | null>(null);
  const [now, setNow] = useState(nowMs);

  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 60_000);
    return () => window.clearInterval(id);
  }, []);

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
    const params = new URLSearchParams({ page: String(page), size: String(size), phase });
    if (q) params.set("q", q);
    return params.toString();
  }, [page, size, phase, q]);
  const requestKey = `${query}#${reloadNonce}`;

  useEffect(() => {
    const ctrl = new AbortController();
    const load = (attempt: number): Promise<Response> =>
      fetch(`/api/arbitration?${query}`, { credentials: "include", cache: "no-store", signal: ctrl.signal }).then(
        (res) => (res.status >= 500 && attempt === 0 ? retry() : res),
        (err: unknown) => {
          if (attempt > 0 || (err instanceof DOMException && err.name === "AbortError")) throw err;
          return retry();
        }
      );
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
          setResult({ key: requestKey, error: typeof data.error === "string" ? data.error : "Could not load arbitration cases." });
          return;
        }
        const body = data as CaseListResponse;
        if (body.totalPages > 0 && body.page >= body.totalPages) {
          setPage(body.totalPages - 1);
          return;
        }
        setResult({ key: requestKey, data: body });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResult({ key: requestKey, error: "Could not load arbitration cases." });
      });
    return () => ctrl.abort();
  }, [query, requestKey]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    if (phase !== "OPEN") url.searchParams.set("phase", phase);
    else url.searchParams.delete("phase");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [q, phase]);

  const loading = result?.key !== requestKey;
  const data = result?.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const error = !loading ? result?.error : undefined;
  const counts = data?.counts;

  function pickPhase(next: CasePhase) {
    setPage(0);
    setPhase(next);
  }

  const rangeLabel = totalElements
    ? `${page * size + 1}–${Math.min((page + 1) * size, totalElements)} of ${totalElements}`
    : "0 cases";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* summary band */}
      <div className="bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-900 px-5 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              Arbitration docket
            </p>
            <p className="mt-1 text-sm text-violet-100/80">
              {data?.schedule
                ? `Deadlines are checked daily at ${data.schedule.checkTime} (Dhaka). Next check: ${formatDhaka(data.schedule.nextCheckAt)}.`
                : "Deadlines are checked daily at 10:00 (Dhaka)."}
            </p>
          </div>
          {data?.panel && (viewer === "curator" || viewer === "manager") ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-violet-100 ring-1 ring-inset ring-white/20">
              Panel: {data.panel.eligible} curators · quorum {data.panel.quorum}
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TILES.map((t) => {
            const active = phase === t.phase;
            return (
              <button
                key={t.phase}
                type="button"
                onClick={() => pickPhase(active ? "OPEN" : t.phase)}
                aria-pressed={active}
                className={`rounded-xl px-3 py-2.5 text-left ring-1 ring-inset transition ${
                  active ? "bg-white text-slate-900 ring-white" : "bg-white/5 ring-white/15 hover:bg-white/10"
                }`}
              >
                <span className={`block text-[11px] font-semibold uppercase tracking-wider ${active ? "text-violet-700" : t.tone}`}>
                  {t.label}
                </span>
                <span className="mt-0.5 block text-2xl font-bold tabular-nums">
                  {counts ? counts[t.phase] : "–"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
        <div className="relative min-w-[14rem] flex-1">
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
            ⌕
          </span>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search word, definition, case or entry ID, party name…"
            aria-label="Search arbitration cases"
            maxLength={100}
            className="font-bengali w-full rounded-xl border border-slate-300 py-2.5 pr-9 pl-8 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
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
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="sr-only sm:not-sr-only">Show</span>
          <select
            value={phase}
            onChange={(e) => pickPhase(e.target.value as CasePhase)}
            aria-label="Filter cases by phase"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          >
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {PHASE_LABEL[p]}
                {counts ? ` (${counts[p]})` : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setReloadNonce((n) => n + 1)}
          disabled={loading}
          className="rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error ? (
        <p className="m-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</p>
      ) : null}

      <div className="thin-scroll relative overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-5 py-2.5 font-semibold">Case</th>
              <th className="px-3 py-2.5 font-semibold">Entry</th>
              <th className="px-3 py-2.5 font-semibold">Parties &amp; notes</th>
              <th className="px-3 py-2.5 font-semibold">Phase</th>
              <th className="px-3 py-2.5 font-semibold">Deadline</th>
              <th className="px-3 py-2.5 font-semibold">Panel</th>
              <th className="px-5 py-2.5 text-right font-semibold">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-100 transition-opacity ${loading && data ? "opacity-50" : ""}`}>
            {loading && !data ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                  Loading cases…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm italic text-slate-400">
                  {q ? "No cases match your search." : emptyMessage(viewer, phase)}
                </td>
              </tr>
            ) : (
              items.map((c) => <CaseRowView key={c.id} c={c} viewer={viewer} now={now} quorum={data?.panel.quorum ?? 0} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <span className="text-xs font-semibold text-slate-500">{rangeLabel}</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Rows
            <select
              value={size}
              onChange={(e) => {
                setPage(0);
                setSize(Number(e.target.value) as PageSize);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-violet-500"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={page <= 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-xs font-semibold tabular-nums text-slate-500">
            {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}

function emptyMessage(viewer: ArbitrationViewer, phase: CasePhase): string {
  if (phase === "RESPONSE_WINDOW") return "No cases are waiting for notes.";
  if (phase === "ACTIVE") return "No cases are open for voting right now.";
  if (phase === "TIE_PENDING") return "No tied cases.";
  if (phase === "RESOLVED") return "No resolved cases yet.";
  if (viewer === "contributor") return "None of your entries are in arbitration.";
  if (viewer === "reviewer") return "You are not a party to any arbitration case.";
  return "There are no open arbitration cases.";
}

function NoteDot({ at, label }: { at: string | null; label: string }) {
  return (
    <span
      title={at ? `${label} note submitted` : `${label} note pending`}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
        at ? "bg-emerald-500 text-white" : "bg-white text-slate-300 ring-1 ring-inset ring-slate-300"
      }`}
    >
      {at ? "✓" : "…"}
    </span>
  );
}

function CaseRowView({
  c,
  viewer,
  now,
  quorum,
}: {
  c: CaseRow;
  viewer: ArbitrationViewer;
  now: number;
  quorum: number;
}) {
  const href = `/dashboard/arbitration/${encodeURIComponent(c.id)}`;
  const reviewerLabel = reviewerTitle(c.stage);
  const deadline =
    c.status === "RESPONSE_WINDOW" ? c.windowClosesAt : c.status === "ACTIVE" ? c.votingClosesAt : null;
  const needsMyVote = viewer === "curator" && c.status === "ACTIVE" && !c.votedByMe;
  const highlight = c.awaitingMyNote || needsMyVote;
  return (
    <tr className={`align-top transition hover:bg-violet-50/40 ${highlight ? "bg-amber-50/40" : ""}`}>
      <td className={`px-5 py-3 ${highlight ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-transparent"}`}>
        <Link href={href} className="font-mono text-xs font-bold text-violet-700 hover:underline">
          {c.id}
        </Link>
        <span className="mt-1 block text-[11px] font-medium text-slate-500">{ORIGIN_LABEL[c.origin]}</span>
        <span className="block text-[11px] text-slate-400">{reviewerLabel} stage</span>
      </td>
      <td className="max-w-[16rem] px-3 py-3">
        <span className="flex flex-wrap items-center gap-1.5">
          <Link href={href} className="font-bengali text-base font-semibold text-slate-800 hover:text-violet-700">
            {c.writtenForm}
          </Link>
          <PosBadge pos={c.pos} full={false} />
        </span>
        <span className="mt-0.5 block font-mono text-[10px] text-slate-300">{c.submissionId}</span>
      </td>
      <td className="px-3 py-3 text-xs">
        <span className="flex items-center gap-1.5 text-slate-700">
          <NoteDot at={c.contributorNoteAt} label="Contributor" />
          <span className="truncate">
            {c.contributor.name ?? c.contributor.id}
            {c.viewerSide === "CONTRIBUTOR" ? <YouBadge /> : null}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-slate-700">
          <NoteDot at={c.reviewerNoteAt} label={reviewerLabel} />
          <span className="truncate">
            {c.reviewer ? (c.reviewer.name ?? c.reviewer.id) : <em className="text-slate-400">No reviewer on record</em>}
            {c.viewerSide === "REVIEWER" ? <YouBadge /> : null}
          </span>
        </span>
        {c.awaitingMyNote ? (
          <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            Your note is needed
          </span>
        ) : null}
      </td>
      <td className="px-3 py-3">
        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[c.status]}`}>
          {STATUS_LABEL[c.status]}
        </span>
        {c.status === "RESPONSE_WINDOW" && c.contributorNoteAt && c.reviewerNoteAt ? (
          <span className="mt-1 block text-[11px] text-slate-500">Both notes in · voting starts after the window</span>
        ) : null}
        {c.status === "ACTIVE" && c.votingRound > 1 ? (
          <span className="mt-1 block text-[11px] text-amber-700">Round {c.votingRound} (extended)</span>
        ) : null}
        {c.status === "RESOLVED" || c.status === "TIE_PENDING" ? (
          <span className="mt-1 block text-[11px] text-slate-500">
            {outcomeLabel(c.status, c.finalVerdict, c.verdictBy, c.stage)}
            {c.resultingState ? ` → ${STATE_LABEL[c.resultingState]}` : ""}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-3 text-xs">
        {deadline ? (
          <>
            <span className="block font-semibold text-slate-700">{countdown(deadline, now)}</span>
            <span className="block text-[11px] text-slate-400">
              {c.status === "RESPONSE_WINDOW" ? "Window closes" : "Voting closes"} {formatDhaka(deadline)}
            </span>
          </>
        ) : c.resolvedAt ? (
          <span className="text-[11px] text-slate-400">Closed {formatDhaka(c.resolvedAt)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-xs">
        {c.status === "RESPONSE_WINDOW" ? (
          <span className="text-slate-300">Not started</span>
        ) : c.votingOpenedAt ? (
          <>
            <span className="block font-semibold tabular-nums text-slate-700">
              {c.votesCast} / {quorum} votes
            </span>
            <span className="mt-1 block h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <span
                className={`block h-full ${c.votesCast >= quorum ? "bg-emerald-500" : "bg-violet-500"}`}
                style={{ width: `${Math.min(100, (c.votesCast / Math.max(quorum, 1)) * 100)}%` }}
              />
            </span>
            {viewer === "curator" ? (
              <span className={`mt-1 block text-[11px] font-semibold ${c.votedByMe ? "text-emerald-700" : needsMyVote ? "text-amber-700" : "text-slate-400"}`}>
                {c.votedByMe ? "✓ You voted" : needsMyVote ? "Awaiting your vote" : "You did not vote"}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        <Link
          href={href}
          className={`inline-block rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            highlight ? "bg-violet-700 text-white hover:bg-violet-800" : "text-violet-700 ring-1 ring-inset ring-violet-200 hover:bg-violet-50"
          }`}
        >
          {c.awaitingMyNote ? "Add note" : needsMyVote ? "Vote" : "Open"}
        </Link>
      </td>
    </tr>
  );
}

function YouBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">You</span>
  );
}
