import Link from "next/link";
import type { ChiefData, DashCase, EditorData } from "@/lib/dashboard";
import { timeAgo } from "@/lib/format";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { BarList, ColumnChart } from "@/components/charts";
import { SubmissionTable } from "./SubmissionTable";
import type { Session } from "@/lib/types";
import { CaseList, DecisionList, MiniStats, ViewAll, formatAge } from "./DashboardParts";

function myRole(c: DashCase, userId: string): string {
  const raised = c.origin === "REVIEWER_ESCALATION" && c.reviewerId === userId;
  if (raised) return "My escalation";
  if (c.origin === "CONTRIBUTOR_DISPUTE" && c.reviewerId === userId)
    return `Disputed by ${c.contributorName ?? "the contributor"}`;
  return `${c.contributorName ?? "Contributor"} vs ${c.reviewerName ?? "reviewer"}`;
}

function oldestHint(oldestAt: string | null): string {
  return oldestAt ? `oldest updated ${timeAgo(oldestAt)}` : "queue is empty";
}

/* ------------------------------------------------------------------ */
/* Lexical Editor dashboard (SRS §7.4.1)                               */
/* ------------------------------------------------------------------ */

export function EditorDashboard({ session, data, now }: { session: Session; data: EditorData; now: number }) {
  const { queue, thisWeek } = data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending review" value={queue.available} hint="unassigned or assigned to me" tone="blue" href="/dashboard/queue" />
        <StatCard label="Assigned to me" value={queue.assignedToMe} tone="purple" href="/dashboard/queue?assigned=me" />
        <StatCard label="Average queue age" value={formatAge(queue.averageAgeHours)} hint={oldestHint(queue.oldestAt)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Queue age distribution" subtitle="Pending entries by time since last update" />
          <div className="p-4 sm:p-5">
            <BarList data={data.ageBuckets} />
          </div>
        </Card>

        <Card>
          <CardHeader title="My review activity" subtitle="Decisions in the last 7 days" />
          <MiniStats
            items={[
              { label: "Approved", value: thisWeek.EDITOR_APPROVED, cls: "text-emerald-700" },
              { label: "Flagged", value: thisWeek.FLAGGED, cls: "text-amber-700" },
              { label: "Rejected", value: thisWeek.REJECTED, cls: "text-red-700" },
              { label: "Escalated", value: thisWeek.ARBITRATION, cls: "text-purple-700" },
            ]}
          />
          <CardHeader title="Recent decisions" action={<ViewAll href="/dashboard/history">History →</ViewAll>} />
          <DecisionList decisions={data.recentDecisions} empty="You have not reviewed any entries yet." />
        </Card>
      </div>

      {data.resubmitted.length > 0 ? (
        <Card>
          <CardHeader
            title="Resubmitted after a flag"
            subtitle="Entries the contributor corrected after a Lexical Editor flagged them"
          />
          <SubmissionTable submissions={data.resubmitted} />
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Arbitration involving me"
          subtitle="Escalations I raised and contributor disputes against my decisions"
          action={<ViewAll href="/dashboard/arbitration">Open arbitration →</ViewAll>}
        />
        <CaseList cases={data.myCases} empty="No arbitration cases involve you." now={now} subtitle={(c) => myRole(c, session.userId)} />
      </Card>

      <div className="flex justify-stretch sm:justify-end">
        <Link
          href="/dashboard/queue"
          className="w-full rounded-xl bg-emerald-700 px-6 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 sm:w-auto"
        >
          Go to Review Queue ({queue.available}) →
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chief Lexical Editor dashboard (SRS §7.5.2)                         */
/* ------------------------------------------------------------------ */

export function ChiefDashboard({ session, data, now }: { session: Session; data: ChiefData; now: number }) {
  const { queue, thisWeek } = data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting final validation" value={queue.available} hint="unassigned or assigned to me" tone="purple" href="/dashboard/queue" />
        <StatCard label="Assigned to me" value={queue.assignedToMe} tone="blue" href="/dashboard/queue?assigned=me" />
        <StatCard label="Average queue age" value={formatAge(queue.averageAgeHours)} hint={oldestHint(queue.oldestAt)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="My validation throughput" subtitle="Decisions in the last 7 days" />
          <MiniStats
            items={[
              { label: "Validated", value: thisWeek.VALIDATED, cls: "text-emerald-700" },
              { label: "C-flagged", value: thisWeek.C_FLAGGED, cls: "text-fuchsia-700" },
              { label: "Escalated", value: thisWeek.ARBITRATION, cls: "text-purple-700" },
            ]}
          />
          <CardHeader title="Platform validation timeline" subtitle="Entries validated per week (last 8 weeks)" />
          <div className="p-4 sm:p-5">
            <ColumnChart data={data.validatedWeekly} color="#576139" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent decisions" subtitle="My final validations, C-flags and escalations" action={<ViewAll href="/dashboard/history">History →</ViewAll>} />
          <DecisionList decisions={data.recentDecisions} empty="You have not reviewed any entries yet." />
          <CardHeader title="Arbitration involving me" action={<ViewAll href="/dashboard/arbitration">Open arbitration →</ViewAll>} />
          <CaseList cases={data.myCases} empty="No arbitration cases involve you." now={now} subtitle={(c) => myRole(c, session.userId)} />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Linguistic review queue"
          subtitle="Oldest editor-approved entries awaiting your final validation"
          action={<ViewAll href="/dashboard/queue">Open full queue →</ViewAll>}
        />
        <SubmissionTable submissions={data.queueItems} emptyMessage="The linguistic review queue is empty — great work!" />
      </Card>
      <p className="text-right text-xs text-slate-400">
        Signed in as {session.name} · only your approval (or a binding panel verdict) promotes entries to Validated
      </p>
    </div>
  );
}
