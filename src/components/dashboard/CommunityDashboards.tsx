import Link from "next/link";
import type { ContributorData, CuratorData } from "@/lib/dashboard";
import { timeAgo } from "@/lib/format";
import { ORIGIN_LABEL } from "@/lib/arbitration";
import { Card, CardHeader, StatCard, StateBadge } from "@/components/ui";
import { ColumnChart } from "@/components/charts";
import { SubmissionTable } from "./SubmissionTable";
import type { Session } from "@/lib/types";
import { CaseList, EmptyRow, MiniStats, QuotaBar, ViewAll } from "./DashboardParts";

/* ------------------------------------------------------------------ */
/* Lexical Contributor dashboard (SRS §7.3.1)                          */
/* ------------------------------------------------------------------ */

export function ContributorDashboard({ data, now }: { session: Session; data: ContributorData; now: number }) {
  const { counts, quota } = data;
  const total = Object.entries(counts).reduce((acc, [state, n]) => (state === "DRAFT" ? acc : acc + n), 0);
  const inReview = counts.PENDING_REVIEW + counts.UNDER_REVIEW + counts.EDITOR_APPROVED;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total submitted" value={total} hint={counts.DRAFT > 0 ? `${counts.DRAFT} draft${counts.DRAFT === 1 ? "" : "s"} not yet submitted` : undefined} href="/dashboard/submissions" />
        <StatCard label="In review" value={inReview} hint={counts.ARBITRATION > 0 ? `${counts.ARBITRATION} in arbitration` : undefined} tone="blue" href="/dashboard/submissions?state=PENDING_REVIEW" />
        <StatCard label="Validated" value={counts.VALIDATED} tone="green" href="/dashboard/submissions?state=VALIDATED" />
        <StatCard label="Rejected" value={counts.REJECTED} tone="red" href="/dashboard/submissions?state=REJECTED" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Submission quota" subtitle="Anti-bot rate limits for your account" />
          <div className="space-y-5 p-4 sm:p-5">
            <QuotaBar
              label="This session"
              used={quota.sessionUsed}
              limit={quota.sessionLimit}
              color="bg-emerald-600"
              hint={quota.sessionStartedAt ? `Since you signed in ${timeAgo(quota.sessionStartedAt)}` : undefined}
            />
            <QuotaBar label="Rolling 24 hours" used={quota.dayUsed} limit={quota.dayLimit} color="bg-sky-500" />
            {quota.blocked > 0 ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                {quota.blocked} submission attempt{quota.blocked === 1 ? " was" : "s were"} blocked by a limit in the last 24
                hours. Your attempts in this window: {quota.attempts} of {quota.suspensionThreshold} — reaching{" "}
                {quota.suspensionThreshold} suspends your account until the Platform Architect reviews it.
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-slate-400">
                Entries plus attempts blocked by a limit count towards automatic suspension at {quota.suspensionThreshold}{" "}
                within 24 hours. After {quota.anomalyThresholdPerHour} entries within an hour, further entries are held for
                moderator review.
              </p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center bg-gradient-to-br from-emerald-700 to-emerald-800 p-6 text-center sm:p-8">
          <p className="font-bengali text-2xl font-bold text-white">নতুন শব্দ যোগ করুন</p>
          <p className="mt-1 text-xs text-emerald-100">Add a new Bengali lexical entry via Quick Input</p>
          <Link
            href="/dashboard/quick-input"
            className="mt-5 rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-emerald-50"
          >
            + Add New Entry
          </Link>
        </Card>
      </div>

      {data.attention.length > 0 ? (
        <Card className="ring-2 ring-amber-200">
          <CardHeader
            title="⚠ Entries requiring your attention"
            subtitle="Returned to you with reviewer comments — edit and resubmit, or raise a dispute"
          />
          <ul className="divide-y divide-slate-50">
            {data.attention.map((s) => (
              <li key={s.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bengali min-w-0 text-lg font-bold text-slate-800">{s.writtenForm}</span>
                  <StateBadge state={s.state} />
                  <span className="text-[11px] text-slate-400">{timeAgo(s.updatedAt)}</span>
                  <Link
                    href={`/dashboard/submissions/${s.id}`}
                    className="w-full rounded-lg bg-amber-600 px-3 py-1.5 text-center text-xs font-bold text-white transition hover:bg-amber-700 sm:ml-auto sm:w-auto"
                  >
                    Edit &amp; Resubmit →
                  </Link>
                </div>
                {s.feedback ? (
                  <p className="font-bengali mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-100">
                    💬 {s.feedback}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="My recent submissions" action={<ViewAll href="/dashboard/submissions" />} />
          <SubmissionTable
            submissions={data.recent}
            showContributor={false}
            emptyMessage="You haven't submitted any entries yet — try Quick Input!"
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Arbitration cases"
              subtitle="Your disputes and reviewer escalations of your entries"
              action={data.myCases.length > 0 ? <ViewAll href="/dashboard/arbitration" /> : undefined}
            />
            <CaseList
              cases={data.myCases}
              now={now}
              empty="No arbitration cases. You may dispute Rejected, Flagged or C-flagged entries."
              subtitle={(c) => `${ORIGIN_LABEL[c.origin]} · opened ${timeAgo(c.openedAt)}`}
            />
          </Card>

          <Card>
            <CardHeader title="My contribution timeline" subtitle="Entries per week, last 8 weeks" />
            <div className="p-4 sm:p-5">
              <ColumnChart data={data.weekly} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Arbitration Curator dashboard (SRS §7.6.2)                          */
/* ------------------------------------------------------------------ */

export function CuratorDashboard({ data, now }: { session: Session; data: CuratorData; now: number }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open for voting" value={data.activeCount} tone="purple" href="/dashboard/arbitration?phase=ACTIVE" />
        <StatCard label="Votes I have cast" value={data.votedCount} tone="green" />
        <StatCard label="Awaiting my vote" value={data.awaitingCount} tone="red" href="/dashboard/arbitration?phase=ACTIVE" />
      </div>

      {data.awaitingCount > 0 ? (
        <Link
          href="/dashboard/arbitration?phase=ACTIVE"
          className="block rounded-2xl border border-purple-300 bg-purple-50 px-5 py-4 text-sm font-bold text-purple-800 transition hover:bg-purple-100"
        >
          ⚖ {data.awaitingCount} case{data.awaitingCount === 1 ? "" : "s"} awaiting your vote — open the voting queue →
        </Link>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Quorum status"
            subtitle={`${data.panel.eligible} active curator${data.panel.eligible === 1 ? "" : "s"} · two-thirds quorum (${data.panel.quorum} votes)`}
          />
          <ul className="divide-y divide-slate-50">
            {data.active.length === 0 ? <EmptyRow>No cases are open for voting.</EmptyRow> : null}
            {data.active.map((c) => {
              const pct = Math.min(100, (c.votesCast / Math.max(c.quorum, 1)) * 100);
              const remaining = Math.max(c.quorum - c.votesCast, 0);
              return (
                <li key={c.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <Link href={`/dashboard/arbitration/${c.id}`} className="font-bengali font-bold text-slate-800 hover:text-emerald-700">
                      {c.writtenForm}
                    </Link>
                    {c.votedByMe ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        ✓ You voted
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs tabular-nums text-slate-500">
                      {c.votesCast}/{c.eligible} cast · {remaining > 0 ? `${remaining} more for quorum` : "quorum reached"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${remaining === 0 ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  {c.votingDeadline ? (
                    <p className="mt-1 text-[11px] text-slate-400">Voting closes {timeAgo(c.votingDeadline)} · individual verdicts stay hidden until then</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Cases in response window" subtitle="The other party has 72 hours to submit a note — not yet open for voting" />
            <CaseList cases={data.responseWindow} empty="No cases in the response window." now={now} />
          </Card>

          <Card>
            <CardHeader title="Tied cases" subtitle="Waiting for the System Moderator to correct and validate" />
            <CaseList cases={data.ties} empty="No tied cases." now={now} />
            <CardHeader title="My voting record" />
            <MiniStats
              items={[
                { label: "Sided with contributor", value: data.myVotes.contributor, cls: "text-emerald-700" },
                { label: "Sided with reviewer", value: data.myVotes.reviewer, cls: "text-sky-700" },
              ]}
            />
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Recently resolved" subtitle="Final outcomes" action={<ViewAll href="/dashboard/arbitration?phase=RESOLVED" />} />
        <CaseList cases={data.resolved} empty="No resolved cases yet." now={now} />
      </Card>
    </div>
  );
}
