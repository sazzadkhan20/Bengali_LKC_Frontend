import Link from "next/link";
import { formatNumber, ROLE_LABEL, timeAgo } from "@/lib/format";
import type { ArchitectData, ModeratorData } from "@/lib/dashboard";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { ColumnChart, FunnelChart } from "@/components/charts";
import type { Session } from "@/lib/types";
import { ActivityFeed, CaseList, EmptyRow, Shortcuts, ViewAll } from "./DashboardParts";

/* ------------------------------------------------------------------ */
/* Platform Architect dashboard (SRS §7.1.1)                           */
/* ------------------------------------------------------------------ */

export function ArchitectDashboard({ session, data }: { session: Session; data: ArchitectData }) {
  const { counts, users, lexicon } = data;
  const alerts: { text: string; href: string }[] = [];
  if (data.newApplications > 0)
    alerts.push({
      text: `${data.newApplications} contributor application${data.newApplications === 1 ? " is" : "s are"} waiting for review`,
      href: "/dashboard/applications",
    });
  if (users.suspended > 0)
    alerts.push({
      text: `${users.suspended} suspended account${users.suspended === 1 ? "" : "s"} awaiting review`,
      href: "/dashboard/users",
    });
  if (data.stuckUnderReview > 0)
    alerts.push({
      text: `${data.stuckUnderReview} entr${data.stuckUnderReview === 1 ? "y has" : "ies have"} been held in Under review for more than 48 hours`,
      href: "/dashboard/queue?state=UNDER_REVIEW",
    });
  if (users.pendingFirstLogin > 0)
    alerts.push({
      text: `${users.pendingFirstLogin} account${users.pendingFirstLogin === 1 ? " has" : "s have"} not completed the mandatory first-login password change`,
      href: "/dashboard/credentials",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm sm:px-5">
        <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          Services online
        </span>
        <span className="text-slate-500">
          Signed-in users: <strong className="text-slate-800">{users.signedIn}</strong>
          <span className="text-slate-400"> of {users.total}</span>
        </span>
        <span className="text-slate-500">
          Lexicon:{" "}
          <strong className="text-slate-800">{formatNumber(lexicon.entries)} entries</strong>
          {lexicon.crowdsourcedEntries > 0 ? (
            <span className="text-slate-400"> · {formatNumber(lexicon.crowdsourcedEntries)} crowdsourced</span>
          ) : null}
        </span>
        <span className="text-slate-500">
          Synsets: <strong className="text-slate-800">{formatNumber(lexicon.synsets)}</strong>
        </span>
        <span className="text-slate-500">
          Last export:{" "}
          {data.lastExport ? (
            <strong className="text-slate-800" title={new Date(data.lastExport.at).toLocaleString("en-GB")}>
              {timeAgo(data.lastExport.at)}
            </strong>
          ) : (
            <strong className="text-amber-700">never</strong>
          )}
        </span>
      </div>

      {alerts.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-bold text-amber-800">⚠ Attention needed</p>
          <ul className="mt-1.5 space-y-1 text-sm text-amber-800">
            {alerts.map((a) => (
              <li key={a.text} className="flex gap-2">
                <span aria-hidden>•</span>
                <Link href={a.href} className="hover:underline">
                  {a.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total submissions" value={formatNumber(data.totalSubmissions)} hint="all pipeline states" href="/dashboard/queue" />
        <StatCard label="Pending review" value={counts.PENDING_REVIEW} tone="blue" href="/dashboard/queue?state=PENDING_REVIEW" />
        <StatCard label="Validated" value={counts.VALIDATED} tone="green" href="/dashboard/queue?state=VALIDATED" />
        <StatCard label="Suspended accounts" value={users.suspended} tone="red" href="/dashboard/users" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Entry pipeline funnel" subtitle="Crowdsourced submissions by lifecycle state" />
          <div className="p-4 sm:p-5">
            <FunnelChart
              data={[
                { label: "Pending review", value: counts.PENDING_REVIEW, color: "#3b6b88" },
                { label: "Editor approved", value: counts.EDITOR_APPROVED, color: "#7a667a" },
                { label: "Arbitration", value: counts.ARBITRATION, color: "#886620" },
                { label: "Validated", value: counts.VALIDATED, color: "#576139" },
              ]}
            />
            <p className="mt-3 text-xs text-slate-500">
              Other states — Draft: {counts.DRAFT} · Flagged: {counts.FLAGGED} · C-flagged: {counts.C_FLAGGED} ·
              Under review: {counts.UNDER_REVIEW} · Rejected: {counts.REJECTED}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Top contributors" subtitle="Last 30 days, ranked by validated submissions" action={<ViewAll href="/dashboard/leaderboard">Leaderboard →</ViewAll>} />
          <ol className="divide-y divide-slate-50">
            {data.topContributors.length === 0 ? <EmptyRow>No submissions in the last 30 days.</EmptyRow> : null}
            {data.topContributors.map((c, i) => (
              <li key={c.userId} className="flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5">
                <span className="w-6 shrink-0 text-center font-bold tabular-nums text-slate-300">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{c.name}</span>
                <span className="hidden shrink-0 text-xs tabular-nums text-slate-400 sm:inline">{c.submitted} submitted</span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-700">{c.validated} validated</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent activity" subtitle="Latest audit-trail events across the platform" action={<ViewAll href="/dashboard/audit">Audit log →</ViewAll>} />
          <ActivityFeed events={data.recentActivity} empty="No activity recorded yet." />
        </Card>

        <Card>
          <CardHeader title="Shortcut actions" />
          <Shortcuts
            items={[
              {
                href: "/dashboard/applications",
                label: data.newApplications > 0 ? `Applications (${data.newApplications})` : "Applications",
                icon: "📨",
              },
              { href: "/dashboard/statistics", label: "Statistics", icon: "📊" },
              { href: "/dashboard/credentials", label: "Issue Credential", icon: "🔑" },
              { href: "/dashboard/users", label: "Manage Users", icon: "👤" },
              { href: "/dashboard/export", label: "XML Export", icon: "⇩" },
              { href: "/dashboard/audit", label: "Audit Log", icon: "🛡" },
              { href: "/dashboard/config", label: "System Config", icon: "⚙" },
              { href: "/dashboard/quick-input", label: "Quick Input", icon: "✎" },
            ]}
          />
          <p className="px-5 pb-4 text-[11px] leading-relaxed text-slate-400">
            Routine Quick Input use by the Platform Architect requires Lexical Committee permission; emergency
            corrections are always available.
          </p>
        </Card>
      </div>
      <p className="text-right text-xs text-slate-400">
        Signed in as {session.name} · {ROLE_LABEL[session.role]}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* System Moderator dashboard (SRS §7.2.1)                             */
/* ------------------------------------------------------------------ */

export function ModeratorDashboard({
  session,
  data,
  now,
}: {
  session: Session;
  data: ModeratorData;
  now: number;
}) {
  const { counts } = data;
  const activeBursts = data.anomalies.filter((a) => a.active);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Pending review" value={counts.PENDING_REVIEW} tone="blue" href="/dashboard/queue?state=PENDING_REVIEW" />
        <StatCard label="Under review" value={counts.UNDER_REVIEW} tone="orange" href="/dashboard/queue?state=UNDER_REVIEW" />
        <StatCard label="Editor approved" value={counts.EDITOR_APPROVED} tone="purple" href="/dashboard/queue?state=EDITOR_APPROVED" />
        <StatCard label="Arbitration" value={counts.ARBITRATION} tone="purple" href="/dashboard/arbitration" />
        <StatCard label="Flagged" value={counts.FLAGGED + counts.C_FLAGGED} hint={`${counts.FLAGGED} flagged · ${counts.C_FLAGGED} C-flagged`} tone="amber" href="/dashboard/queue?state=FLAGGED" />
      </div>

      {data.anomalies.length > 0 || data.autoSuspensions.length > 0 ? (
        <Card className={activeBursts.length > 0 ? "ring-2 ring-red-300" : ""}>
          <CardHeader
            title={
              activeBursts.length > 0
                ? `⚠ Unusual activity — ${activeBursts.length} account${activeBursts.length === 1 ? "" : "s"} in a submission burst`
                : "Anti-bot alerts"
            }
            subtitle={`Accounts creating ${data.anomalyThresholdPerHour}+ entries within an hour, and automatic suspensions. Burst entries are held UNDER_REVIEW.`}
            action={<ViewAll href="/dashboard/audit?type=USER">Audit log →</ViewAll>}
          />
          <ul className="divide-y divide-slate-100">
            {data.anomalies.map((a) => (
              <li key={a.userId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/dashboard/community/profile/${a.userId}`} className="font-semibold text-slate-800 hover:underline">
                      {a.name}
                    </Link>
                    <span className="text-xs text-slate-400">{ROLE_LABEL[a.role as Session["role"]] ?? a.role}</span>
                    {a.active ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 ring-1 ring-inset ring-red-200">
                        Active burst
                      </span>
                    ) : null}
                    {a.suspended ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200">
                        Suspended
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {a.lastHour} entr{a.lastHour === 1 ? "y" : "ies"} in the last hour · {a.held} held UNDER_REVIEW
                    {a.lastAlertAt ? ` · alerted ${timeAgo(a.lastAlertAt)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {a.held > 0 ? (
                    <Link
                      href="/dashboard/queue?state=UNDER_REVIEW"
                      className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-700"
                    >
                      Review held
                    </Link>
                  ) : null}
                  <Link
                    href={`/dashboard/audit?actor=${encodeURIComponent(a.userId)}`}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Activity
                  </Link>
                </div>
              </li>
            ))}
            {data.autoSuspensions.map((s) => (
              <li key={`${s.userId}-${s.at}`} className="px-4 py-3 sm:px-5">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span aria-hidden>⛔</span>
                  <Link href={`/dashboard/community/profile/${s.userId}`} className="font-semibold text-slate-800 hover:underline">
                    {s.name}
                  </Link>
                  <span className="text-xs text-slate-500">suspended automatically {timeAgo(s.at)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                      s.stillSuspended ? "bg-red-50 text-red-700 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    }`}
                  >
                    {s.stillSuspended ? "Awaiting Architect review" : "Reinstated"}
                  </span>
                </p>
                {s.detail ? <p className="mt-0.5 break-words text-xs text-slate-500">{s.detail}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {counts.UNDER_REVIEW > 0 ? (
        <Link
          href="/dashboard/queue?state=UNDER_REVIEW"
          className="block rounded-2xl border border-orange-300 bg-orange-50 px-5 py-4 transition hover:bg-orange-100"
        >
          <p className="text-sm font-bold text-orange-800">
            🛑 {counts.UNDER_REVIEW} entr{counts.UNDER_REVIEW === 1 ? "y" : "ies"} held by the anti-bot system —
            clearance required
          </p>
          <p className="mt-0.5 text-xs text-orange-700">
            {data.underReviewOld > 0
              ? `${data.underReviewOld} held for more than 30 days.`
              : "Open the queue to clear or reject them."}
          </p>
        </Link>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Open arbitration cases"
            subtitle="Progress only — curator verdicts stay hidden until voting closes"
            action={<ViewAll href="/dashboard/arbitration" />}
          />
          <CaseList cases={data.openCases} empty="No open arbitration cases." now={now} />
        </Card>

        <Card className={data.ties.length > 0 ? "ring-2 ring-amber-300" : ""}>
          <CardHeader
            title="Tied cases"
            subtitle="The panel split evenly — correct and validate the entry to resolve"
            action={data.ties.length > 0 ? <ViewAll href="/dashboard/arbitration?phase=TIE_PENDING" /> : undefined}
          />
          <CaseList
            cases={data.ties}
            empty="No tied cases are waiting for you."
            now={now}
            action={(c) => (
              <Link
                href={`/dashboard/quick-input?tieCase=${encodeURIComponent(c.id)}`}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
              >
                Correct & validate →
              </Link>
            )}
          />
          <CardHeader
            title="Recent tie corrections"
            subtitle="Entries you corrected and validated to close a tie"
            action={<ViewAll href="/dashboard/corrections">Corrections →</ViewAll>}
          />
          {data.recentCorrections.length === 0 ? (
            <EmptyRow>No tie corrections yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentCorrections.map((r) => (
                <li key={r.caseId} className="px-4 py-3 sm:px-5">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                    <Link
                      href={`/dashboard/submissions/${encodeURIComponent(r.submissionId)}`}
                      className="font-bengali font-semibold text-slate-800 hover:underline"
                    >
                      {r.word}
                    </Link>
                    <span className="font-mono text-[11px] text-slate-400">{r.caseId}</span>
                    {r.resolvedAt ? <span className="text-xs text-slate-500">{timeAgo(r.resolvedAt)}</span> : null}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-slate-500">
                    {r.changes.length === 0
                      ? "Validated without changes"
                      : `Changed: ${r.changes.map((c) => c.field).join(", ")}`}
                    {r.moderatorName ? ` · by ${r.moderatorName}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Pipeline throughput" subtitle="Submissions per week (last 5 weeks)" />
          <div className="p-4 sm:p-5">
            <ColumnChart data={data.weekly} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent queue events" subtitle="State changes, arbitration and account actions" action={<ViewAll href="/dashboard/audit">Audit log →</ViewAll>} />
          <ActivityFeed events={data.recentActivity} empty="No queue events yet." />
        </Card>
      </div>

      <Card>
        <CardHeader title="Shortcut actions" />
        <Shortcuts
          className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
          items={[
            { href: "/dashboard/queue?state=UNDER_REVIEW", label: "Clear Under-Review", icon: "🧹" },
            { href: "/dashboard/queue", label: "Assign Entries", icon: "📌" },
            { href: "/dashboard/quick-input", label: "Direct Approval", icon: "⚡" },
            { href: "/dashboard/arbitration?phase=TIE_PENDING", label: "Tied Cases", icon: "⚖" },
            { href: "/dashboard/corrections", label: "Corrections", icon: "🩹" },
            { href: "/dashboard/audit", label: "Audit Log", icon: "🛡" },
          ]}
        />
      </Card>
      <p className="text-right text-xs text-slate-400">
        Signed in as {session.name} · {ROLE_LABEL[session.role]} · Anomaly alert threshold:{" "}
        {data.anomalyThresholdPerHour} entries/hour
      </p>
    </div>
  );
}
