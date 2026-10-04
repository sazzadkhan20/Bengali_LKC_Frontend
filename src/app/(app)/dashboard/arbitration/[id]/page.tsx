import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { nowMs, ROLE_LABEL, STATE_LABEL } from "@/lib/format";
import {
  countdown,
  formatDhaka,
  ORIGIN_HINT,
  ORIGIN_LABEL,
  outcomeLabel,
  reviewerTitle,
  STATUS_LABEL,
  STATUS_STYLE,
  type CaseDetail,
} from "@/lib/arbitration";
import { Card, CardHeader, IdChip, PageTitle, PosBadge, StateBadge } from "@/components/ui";
import { CuratorVotePanel, PartyNoteForm } from "@/components/dashboard/ArbitrationActions";

export const metadata: Metadata = { title: "Arbitration Case" };

function Breadcrumb({ id }: { id: string }) {
  return (
    <nav className="mb-4 text-xs text-slate-400">
      <Link href="/dashboard/arbitration" className="hover:text-violet-700">
        Arbitration
      </Link>{" "}
      / <span className="font-mono text-slate-600">{id}</span>
    </nav>
  );
}

function Step({
  n,
  title,
  detail,
  state,
}: {
  n: number;
  title: string;
  detail: ReactNode;
  state: "done" | "current" | "upcoming";
}) {
  const dot =
    state === "done"
      ? "bg-emerald-500 text-white"
      : state === "current"
        ? "bg-violet-600 text-white ring-4 ring-violet-100"
        : "bg-white text-slate-400 ring-1 ring-inset ring-slate-300";
  return (
    <li className="flex min-w-0 flex-1 gap-3">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${dot}`}>
        {state === "done" ? "✓" : n}
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-bold ${state === "upcoming" ? "text-slate-400" : "text-slate-800"}`}>{title}</span>
        <span className="block text-xs text-slate-500">{detail}</span>
      </span>
    </li>
  );
}

function NoteBlock({
  note,
  noteAt,
  tone,
  pending,
}: {
  note: string | null;
  noteAt: string | null;
  tone: "emerald" | "rose";
  pending: ReactNode;
}) {
  if (!note) {
    return <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm italic text-slate-400">{pending}</p>;
  }
  const cls =
    tone === "emerald" ? "bg-emerald-50 ring-emerald-100" : "bg-rose-50 ring-rose-100";
  return (
    <div>
      <p className={`font-bengali whitespace-pre-wrap rounded-lg px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ${cls}`}>{note}</p>
      {noteAt ? <p className="mt-1 text-[11px] text-slate-400">Last updated {formatDhaka(noteAt)} (Dhaka)</p> : null}
    </div>
  );
}

export default async function ArbitrationCasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const result = await backendAuthedFetch<CaseDetail>(`/api/arbitration/${encodeURIComponent(id)}`);
  if (result.status === 401) redirect("/login");
  if (result.status === 404) notFound();
  if (result.status === 403) {
    return (
      <div className="mx-auto max-w-3xl">
        <Breadcrumb id={id} />
        <PageTitle title="Case not available" subtitle={`Arbitration case ${id}`} />
        <Card>
          <div className="flex items-start gap-3 p-5 text-sm text-slate-700">
            <span aria-hidden="true" className="text-lg leading-none">🔒</span>
            <div className="space-y-3">
              <p>{(result.data as { error?: string }).error ?? "This arbitration case is not available to you."}</p>
              <Link href="/dashboard/arbitration" className="inline-block text-xs font-semibold text-violet-700 hover:underline">
                ← Back to arbitration cases
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  if (!result.ok) {
    throw new Error((result.data as { error?: string }).error ?? "Could not load the arbitration case.");
  }

  const c = result.data;
  const now = nowMs();
  const s = c.submission;
  const reviewerLabel = reviewerTitle(c.stage);
  const windowLabel = `the daily check on ${formatDhaka(c.responseWindow.closesAt)} (Dhaka)`;
  const bothNotes = Boolean(c.contributor.note && c.reviewer?.note);
  const v = c.voting;
  const decided = c.status === "RESOLVED" || c.status === "TIE_PENDING";
  const contributorName = c.contributor.name ?? c.contributor.id;
  const reviewerName = c.reviewer ? (c.reviewer.name ?? c.reviewer.id) : reviewerLabel;

  const pendingText = (who: "contributor" | "reviewer") =>
    c.status === "RESPONSE_WINDOW"
      ? `Waiting for the ${who === "contributor" ? "contributor" : reviewerLabel}'s note — open until ${windowLabel}.`
      : `No note was submitted within the 72-hour response window.`;

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumb id={c.id} />
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-bengali">{s.writtenForm}</span>
            <PosBadge pos={s.pos} />
            <StateBadge state={s.state} />
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[c.status]}`}>
              {STATUS_LABEL[c.status]}
            </span>
          </span>
        }
        subtitle={`${ORIGIN_LABEL[c.origin]} · ${reviewerLabel} stage · opened ${formatDhaka(c.openedAt)} by ${c.openedBy.name ?? c.openedBy.id}${c.openedBy.role ? ` (${ROLE_LABEL[c.openedBy.role]})` : ""}`}
      />

      {/* status banner */}
      <div
        className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
          c.status === "RESOLVED"
            ? "border-slate-200 bg-white text-slate-700"
            : c.status === "TIE_PENDING"
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : c.status === "ACTIVE"
                ? "border-violet-300 bg-violet-50 text-violet-900"
                : "border-sky-300 bg-sky-50 text-sky-900"
        }`}
      >
        {c.status === "RESPONSE_WINDOW" ? (
          <div className="space-y-1">
            <p>
              <strong>Response window open.</strong> {ORIGIN_HINT[c.origin]} Notes can be submitted or updated until{" "}
              {windowLabel} ({countdown(c.responseWindow.closesAt, now)}). The 72 hours end{" "}
              {formatDhaka(c.responseWindow.deadline)}.
            </p>
            <p className="text-xs">
              {bothNotes
                ? "Both notes are in. Curator voting starts when the window is closed by the daily check."
                : "Voting has not started. If only one side submits a note, that side's position stands when the window closes."}
            </p>
          </div>
        ) : c.status === "ACTIVE" && v ? (
          <div className="space-y-1">
            <p>
              <strong>Voting open{v.round > 1 ? ` — round ${v.round}` : ""}.</strong> {v.cast} of {v.quorum} required votes
              cast ({v.eligible} eligible curators). Voting closes at the daily check on{" "}
              {v.closesAt ? `${formatDhaka(v.closesAt)} (Dhaka)` : "—"}
              {v.closesAt ? ` · ${countdown(v.closesAt, now)}` : ""}.
            </p>
            <p className="text-xs">
              If fewer than two thirds of the panel have voted by then, voting is extended by another 7 days.
            </p>
          </div>
        ) : c.outcome ? (
          <div className="space-y-1">
            <p>
              <strong>{outcomeLabel(c.status, c.outcome.verdict, c.outcome.verdictBy, c.stage)}.</strong>{" "}
              {c.outcome.resultingState ? `The entry moved to ${STATE_LABEL[c.outcome.resultingState]}.` : ""}
              {c.outcome.resolvedAt ? ` Closed ${formatDhaka(c.outcome.resolvedAt)} (Dhaka).` : ""}
            </p>
            {c.outcome.note ? <p className="text-xs">{c.outcome.note}</p> : null}
            {c.status === "TIE_PENDING" ? (
              <p className="text-xs">
                The entry stays in arbitration until the System Moderator corrects and validates it.
              </p>
            ) : null}
            {c.outcome.verdictBy === "TIE_BREAK" && c.outcome.resolvedBy ? (
              <p className="text-xs">
                Resolved by {c.outcome.resolvedBy.name ?? c.outcome.resolvedBy.id}
                {c.outcome.resolvedBy.role ? ` (${ROLE_LABEL[c.outcome.resolvedBy.role]})` : ""}.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {c.viewer.canResolveTie ? (
        <Card className="mb-6 overflow-hidden border-amber-300 ring-2 ring-amber-200">
          <div className="flex flex-col gap-4 bg-gradient-to-r from-amber-50 via-white to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg text-amber-700"
              >
                ⚖
              </span>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-slate-800">This tie needs your decision</p>
                <p className="text-slate-600">
                  Review both notes and the curators&apos; rationales below, then open the entry in Quick Input. Correct
                  anything that needs fixing and submit. The entry is validated directly, added to the lexicon and this
                  case is closed.
                </p>
              </div>
            </div>
            <Link
              href={`/dashboard/quick-input?tieCase=${encodeURIComponent(c.id)}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              ✎ Correct &amp; validate
            </Link>
          </div>
        </Card>
      ) : null}

      {/* phase tracker */}
      <Card className="mb-6">
        <ol className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:gap-6">
          <Step
            n={1}
            title="Notes (72 hours)"
            state={c.status === "RESPONSE_WINDOW" ? "current" : "done"}
            detail={
              c.responseWindow.closedAt
                ? `Closed ${formatDhaka(c.responseWindow.closedAt)}`
                : `Closes ${formatDhaka(c.responseWindow.closesAt)}`
            }
          />
          <Step
            n={2}
            title="Curator vote (7 days)"
            state={v ? (c.status === "ACTIVE" ? "current" : "done") : decided ? "done" : "upcoming"}
            detail={
              v
                ? c.status === "ACTIVE"
                  ? `Round ${v.round} · closes ${v.closesAt ? formatDhaka(v.closesAt) : "—"}`
                  : `${v.cast} votes cast`
                : decided
                  ? "Not needed"
                  : bothNotes
                    ? "Starts after the window"
                    : "Needs both notes"
            }
          />
          <Step
            n={3}
            title="Decision"
            state={c.status === "RESOLVED" ? "done" : c.status === "TIE_PENDING" ? "current" : "upcoming"}
            detail={
              c.outcome
                ? outcomeLabel(c.status, c.outcome.verdict, c.outcome.verdictBy, c.stage)
                : "Applied automatically by the daily check"
            }
          />
        </ol>
      </Card>

      {c.openingNote ? (
        <Card className="mb-6 border-l-4 border-l-amber-400">
          <CardHeader title="Emergency override reason" subtitle={`Recorded by ${c.openedBy.name ?? c.openedBy.id}`} />
          <p className="font-bengali whitespace-pre-wrap px-5 py-4 text-sm text-slate-700">{c.openingNote}</p>
        </Card>
      ) : null}

      {/* side-by-side positions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader
            title={`Contributor — ${contributorName}${c.viewer.side === "CONTRIBUTOR" ? " (you)" : ""}`}
            subtitle={ROLE_LABEL[c.contributor.role ?? "CONTRIBUTOR"]}
          />
          <div className="space-y-3 p-5 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-bengali text-xl font-bold">{s.writtenForm}</span>
              <PosBadge pos={s.pos} />
              {s.synsetId ? <IdChip id={s.synsetId} /> : null}
              {s.ili && s.ili.toLowerCase() !== "n/a" ? (
                <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                  ILI {s.ili}
                </span>
              ) : null}
            </p>
            {s.definition ? (
              <p className="font-bengali rounded-lg bg-slate-50 px-3 py-2 text-slate-700">{s.definition}</p>
            ) : null}
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Contributor note</p>
              <NoteBlock note={c.contributor.note} noteAt={c.contributor.noteAt} tone="emerald" pending={pendingText("contributor")} />
            </div>
            {c.viewer.side === "CONTRIBUTOR" && c.viewer.canEditNote ? (
              <div className="border-t border-slate-100 pt-3">
                <PartyNoteForm
                  caseId={c.id}
                  side="CONTRIBUTOR"
                  currentNote={c.contributor.note}
                  min={c.rules.noteMin}
                  max={c.rules.noteMax}
                  closesAtLabel={windowLabel}
                />
              </div>
            ) : null}
            <Link
              href={`/dashboard/submissions/${encodeURIComponent(s.id)}`}
              className="inline-block text-xs font-semibold text-emerald-700 hover:underline"
            >
              View full submission record →
            </Link>
          </div>
        </Card>

        <Card className="border-l-4 border-l-rose-400">
          <CardHeader
            title={`${reviewerLabel} — ${reviewerName}${c.viewer.side === "REVIEWER" ? " (you)" : ""}`}
            subtitle={
              c.stage === "CHIEF"
                ? "Decision under dispute: final validation stage"
                : "Decision under dispute: first review stage"
            }
          />
          <div className="space-y-3 p-5 text-sm">
            {c.reviewer ? (
              <>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{reviewerLabel} note</p>
                  <NoteBlock note={c.reviewer.note} noteAt={c.reviewer.noteAt} tone="rose" pending={pendingText("reviewer")} />
                </div>
                {c.viewer.side === "REVIEWER" && c.viewer.canEditNote ? (
                  <div className="border-t border-slate-100 pt-3">
                    <PartyNoteForm
                      caseId={c.id}
                      side="REVIEWER"
                      currentNote={c.reviewer.note}
                      min={c.rules.noteMin}
                      max={c.rules.noteMax}
                      closesAtLabel={windowLabel}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm italic text-slate-400">
                No {reviewerLabel} decision is on record for this entry, so no reviewer note can be submitted.
              </p>
            )}
            {c.viewer.side && !c.viewer.canEditNote ? (
              <p className="text-[11px] text-slate-500">
                The response window is closed; notes are read-only.
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      {/* panel voting — only once the window has closed with both notes */}
      {v ? (
        <Card className="mt-6">
          <CardHeader
            title={`Curator panel — ${v.cast} of ${v.quorum} required votes`}
            subtitle={
              v.closed
                ? "Voting closed"
                : `Round ${v.round} · ${v.eligible} eligible curators · individual votes stay hidden until voting closes`
            }
          />
          <div className="space-y-4 p-5">
            <div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={v.cast >= v.quorum ? "bg-emerald-500" : "bg-violet-500"}
                  style={{ width: `${Math.min(100, (v.cast / Math.max(v.quorum, 1)) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {v.cast >= v.quorum
                  ? "Quorum reached. The majority decides when voting closes."
                  : `${v.quorum - v.cast} more vote${v.quorum - v.cast === 1 ? "" : "s"} needed for the two-thirds quorum.`}
                {v.extensions > 0 ? ` Extended ${v.extensions} time${v.extensions === 1 ? "" : "s"}.` : ""}
              </p>
            </div>

            {typeof v.contributorVotes === "number" && typeof v.reviewerVotes === "number" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-inset ring-emerald-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">For the contributor</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-800">{v.contributorVotes}</p>
                </div>
                <div className="rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-inset ring-rose-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">For the {reviewerLabel}</p>
                  <p className="text-2xl font-bold tabular-nums text-rose-800">{v.reviewerVotes}</p>
                </div>
              </div>
            ) : null}

            {v.votes && v.votes.length > 0 ? (
              <ul className="space-y-2">
                {v.votes.map((vote) => (
                  <li key={vote.curator.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm">
                    <p className="font-semibold text-slate-700">
                      {vote.curator.name ?? vote.curator.id} —{" "}
                      <span className={vote.verdict === "CONTRIBUTOR" ? "text-emerald-700" : "text-rose-600"}>
                        {vote.verdict === "CONTRIBUTOR" ? "supports the contributor" : `supports the ${reviewerLabel}`}
                      </span>
                      <span className="ml-2 text-[10px] font-normal text-slate-400">{formatDhaka(vote.votedAt)}</span>
                    </p>
                    <p className="font-bengali mt-1 whitespace-pre-wrap text-xs text-slate-600">{vote.rationale}</p>
                  </li>
                ))}
              </ul>
            ) : null}

            {v.myVote ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p>
                  ✓ You voted to{" "}
                  <strong>{v.myVote.verdict === "CONTRIBUTOR" ? "support the contributor" : `support the ${reviewerLabel}`}</strong>{" "}
                  on {formatDhaka(v.myVote.votedAt)}.
                </p>
                <p className="font-bengali mt-1 whitespace-pre-wrap text-xs text-emerald-800">{v.myVote.rationale}</p>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {c.viewer.isCurator && c.viewer.canVote ? (
        <Card className="mt-6 ring-2 ring-violet-200">
          <CardHeader
            title="Cast your vote"
            subtitle="Read both notes and the full submission record, then choose a side. Your rationale is mandatory."
          />
          <div className="p-5">
            <CuratorVotePanel
              caseId={c.id}
              reviewerLabel={reviewerLabel}
              contributorName={contributorName}
              reviewerName={reviewerName}
              min={c.rules.rationaleMin}
              max={c.rules.rationaleMax}
            />
          </div>
        </Card>
      ) : null}
      {c.viewer.isCurator && !c.viewer.canVote && c.viewer.voteBlockedReason && c.status === "ACTIVE" && !v?.myVote ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {c.viewer.voteBlockedReason}
        </p>
      ) : null}
    </div>
  );
}
