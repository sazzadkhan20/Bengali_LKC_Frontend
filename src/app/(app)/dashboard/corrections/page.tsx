import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import type { TieCorrectionRecord, TieQueueItem } from "@/lib/dashboard";
import type { POS } from "@/lib/types";
import { Card, CardHeader, EmptyState, PageTitle, Pagination, PosBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Tie Corrections" };
export const dynamic = "force-dynamic";

type CorrectionsResponse = {
  q: string;
  queue: TieQueueItem[];
  history: TieCorrectionRecord[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
  error?: string;
};

const PAGE_SIZE = 10;
const POS_SET = new Set(["n", "v", "a", "r"]);

const STAGE_LABEL: Record<string, string> = {
  EDITOR: "Editor rejection",
  CHIEF: "Chief Editor rejection",
};

const STATE_LABEL: Record<string, string> = {
  VALIDATED: "Validated",
  ARBITRATION: "In arbitration",
};

function dhaka(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Pos({ pos }: { pos: string | null }) {
  return pos && POS_SET.has(pos) ? <PosBadge pos={pos as POS} /> : null;
}

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

export default async function CorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "apply_corrections")) redirect("/dashboard");

  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const qs = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (q) qs.set("q", q);

  let data: CorrectionsResponse | null = null;
  let error: string | null = null;
  try {
    const res = await backendAuthedFetch<CorrectionsResponse>(`/api/arbitration/corrections?${qs.toString()}`);
    if (res.status === 401) redirect("/login");
    if (res.ok) data = res.data;
    else error = res.status >= 500 ? "The corrections service is unavailable. Try again shortly." : res.data.error ?? "Could not load corrections.";
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    error = "The corrections service is unavailable. Try again shortly.";
  }

  const hrefFor = (next: { page?: number; q?: string }) => {
    const p = new URLSearchParams();
    const query = next.q ?? q;
    if (query) p.set("q", query);
    if (next.page && next.page > 1) p.set("page", String(next.page));
    const str = p.toString();
    return `/dashboard/corrections${str ? `?${str}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Tie Corrections"
        subtitle="When the curator panel splits evenly, the System Moderator corrects the entry and validates it to close the case. Tied cases waiting for you are listed first, followed by every correction made so far."
      />

      <form action="/dashboard/corrections" method="get" className="mb-6 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="corrections-q" className="sr-only">
          Search corrections
        </label>
        <input
          id="corrections-q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={80}
          placeholder="Search by word, definition, case id or entry id"
          className="w-full min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:flex-none"
          >
            Search
          </button>
          {q ? (
            <Link
              href="/dashboard/corrections"
              className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 sm:flex-none"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : data ? (
        <div className="space-y-8">
          <section aria-labelledby="queue-heading">
            <h2 id="queue-heading" className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              Waiting for your correction
              <span
                className={`rounded-full px-2 text-[11px] font-bold ${
                  data.queue.length > 0 ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {data.queue.length}
              </span>
            </h2>
            {data.queue.length === 0 ? (
              <EmptyState
                title={q ? "No tied cases match your search" : "No tied cases are waiting"}
                message={q ? undefined : "A case appears here when curator voting closes with an even split."}
              />
            ) : (
              <div className="space-y-3">
                {data.queue.map((c) => (
                  <Card key={c.caseId} className="ring-1 ring-amber-200">
                    <div className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-bengali text-lg font-bold text-slate-900">{c.word}</span>
                          <Pos pos={c.pos} />
                          <span className="font-mono text-[11px] text-slate-400">{c.caseId}</span>
                        </p>
                        {c.definition ? (
                          <p className="mt-1 break-words font-bengali text-sm text-slate-600">{c.definition}</p>
                        ) : null}
                        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{STAGE_LABEL[c.stage] ?? c.stage}</span>
                          {c.tally ? <span className="font-medium text-amber-700">{c.tally}</span> : null}
                          <span>Voting closed {dhaka(c.votingClosedAt)}</span>
                          {c.contributorName ? <span>Contributor: {c.contributorName}</span> : null}
                          {c.reviewerName ? <span>Reviewer: {c.reviewerName}</span> : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
                        <Link
                          href={`/dashboard/arbitration/${encodeURIComponent(c.caseId)}`}
                          className="rounded-xl px-4 py-2 text-center text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                        >
                          Case details
                        </Link>
                        <Link
                          href={`/dashboard/quick-input?tieCase=${encodeURIComponent(c.caseId)}`}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-amber-700"
                        >
                          Correct & validate →
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Correction history">
            <Card>
              <CardHeader
                title="Correction history"
                subtitle={
                  data.total === 0
                    ? "No tie corrections recorded yet"
                    : `${data.total} correction${data.total === 1 ? "" : "s"} · newest first`
                }
              />
              {data.history.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  {q ? "No corrections match your search." : "Corrections you make will be listed here with every changed field."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.history.map((r) => (
                    <li key={r.caseId} className="px-4 py-4 sm:px-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/submissions/${encodeURIComponent(r.submissionId)}`}
                              className="font-bengali text-base font-bold text-slate-900 hover:text-emerald-700"
                            >
                              {r.word}
                            </Link>
                            <Pos pos={r.pos} />
                            <Link
                              href={`/dashboard/arbitration/${encodeURIComponent(r.caseId)}`}
                              className="font-mono text-[11px] text-slate-400 hover:text-violet-700"
                            >
                              {r.caseId}
                            </Link>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Corrected by{" "}
                            {r.moderatorId ? (
                              <Link
                                href={`/dashboard/community/profile/${encodeURIComponent(r.moderatorId)}`}
                                className="font-semibold text-slate-700 hover:underline"
                              >
                                {r.moderatorName ?? r.moderatorId}
                              </Link>
                            ) : (
                              "the System Moderator"
                            )}{" "}
                            on {dhaka(r.resolvedAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            {STATE_LABEL[r.state] ?? r.state}
                          </span>
                          {r.entryId ? (
                            <Link
                              href={`/word/${encodeURIComponent(r.entryId)}`}
                              className="text-xs font-semibold text-emerald-700 hover:underline"
                            >
                              View in dictionary →
                            </Link>
                          ) : null}
                        </div>
                      </div>

                      {r.changes.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-600">Validated without changes.</p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {r.changes.map((ch) => {
                            const recorded = ch.before !== null || ch.after !== null;
                            return (
                              <li key={ch.field} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{ch.field}</p>
                                {recorded ? (
                                  <div className="mt-1 grid gap-1 text-sm sm:grid-cols-2 sm:gap-3">
                                    <p className="min-w-0 break-words">
                                      <span className="mr-1 text-[11px] font-semibold uppercase text-red-600">Before</span>
                                      <span className="font-bengali text-slate-500 line-through decoration-red-300">
                                        {ch.before ?? "—"}
                                      </span>
                                    </p>
                                    <p className="min-w-0 break-words">
                                      <span className="mr-1 text-[11px] font-semibold uppercase text-emerald-700">After</span>
                                      <span className="font-bengali text-slate-800">{ch.after ?? "—"}</span>
                                    </p>
                                  </div>
                                ) : (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Changed — the previous and new values were not recorded for this older correction.
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => hrefFor({ page: p })} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
