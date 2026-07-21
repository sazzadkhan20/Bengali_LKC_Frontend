import Link from "next/link";
import { lexiconStats } from "@/lib/lexicon";
import { store, userById } from "@/lib/store";
import {
  countsByState,
  quorumInfo,
  recentAudit,
  topContributors,
  weeklySubmissionSeries,
} from "@/lib/queries";
import { formatNumber, ROLE_LABEL, STATE_LABEL, timeAgo, nowMs } from "@/lib/format";
import { Card, CardHeader, StatCard, StateBadge } from "@/components/ui";
import { ColumnChart, FunnelChart } from "@/components/charts";
import type { Session } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Platform Architect dashboard (SRS §7.1.1)                           */
/* ------------------------------------------------------------------ */

export function ArchitectDashboard({ session }: { session: Session }) {
  const now = nowMs();
  const counts = countsByState();
  const stats = lexiconStats();
  const totalSubs = store.submissions.length;
  const suspended = store.users.filter((u) => u.suspended).length;
  const pendingFirstLogin = store.credentials.filter(
    (c) => !c.deactivated && c.oneTime
  ).length;
  const stuck = store.submissions.filter(
    (s) =>
      s.state === "UNDER_REVIEW" &&
      now - new Date(s.updatedAt).getTime() > 48 * 3600 * 1000
  ).length;
  const alerts: string[] = [];
  if (suspended > 0)
    alerts.push(`${suspended} suspended account(s) awaiting review`);
  if (stuck > 0) alerts.push(`${stuck} entry(ies) stuck in UNDER_REVIEW > 48 hrs`);
  if (pendingFirstLogin > 0)
    alerts.push(
      `${pendingFirstLogin} account(s) with a mandatory first-login password change still pending`
    );

  return (
    <div className="space-y-6">
      {/* ① System health bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs shadow-sm">
        <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Server healthy
        </span>
        <span className="text-slate-500">
          Active sessions: <strong className="text-slate-800">7</strong>
        </span>
        <span className="text-slate-500">
          Canonical lexicon:{" "}
          <strong className="text-slate-800">
            {formatNumber(stats.totalEntries)} entries
          </strong>
        </span>
        <span className="text-slate-500">
          Last backup: <strong className="text-slate-800">02:00 UTC</strong>
        </span>
        <span className="text-slate-500">
          Export queue: <strong className="text-emerald-700">idle</strong>
        </span>
      </div>

      {/* ⑤ Alerts */}
      {alerts.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-bold text-amber-800">⚠ Attention needed</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sm text-amber-700">
            {alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ② Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total submissions" value={formatNumber(totalSubs)} hint="all pipeline states" href="/dashboard/queue" />
        <StatCard label="Pending review" value={counts.PENDING_REVIEW} tone="blue" href="/dashboard/queue?state=PENDING_REVIEW" />
        <StatCard label="Validated" value={counts.VALIDATED} tone="green" href="/dashboard/queue?state=VALIDATED" />
        <StatCard label="Suspended accounts" value={suspended} tone="red" href="/dashboard/users" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ③ Pipeline funnel */}
        <Card>
          <CardHeader
            title="Entry pipeline funnel"
            subtitle="Crowdsourced submissions by lifecycle state"
          />
          <div className="p-5">
            <FunnelChart
              data={[
                { label: "Draft", value: counts.DRAFT, color: "#848870" },
                { label: "Pending review", value: counts.PENDING_REVIEW, color: "#3b6b88" },
                { label: "Editor approved", value: counts.EDITOR_APPROVED, color: "#7a667a" },
                { label: "Validated", value: counts.VALIDATED, color: "#576139" },
              ]}
            />
            <p className="mt-3 text-xs text-slate-400">
              Other states — Flagged: {counts.FLAGGED} · C-Flagged: {counts.C_FLAGGED} · Under review: {counts.UNDER_REVIEW} · Arbitration: {counts.ARBITRATION} · Rejected: {counts.REJECTED}
            </p>
          </div>
        </Card>

        {/* ⑥ Top contributors */}
        <Card>
          <CardHeader
            title="Top contributors this month"
            subtitle="Ranked by validated submissions"
          />
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <tbody className="divide-y divide-slate-50">
                {topContributors().map((c, i) => (
                  <tr key={c.userId}>
                    <td className="w-10 px-4 py-2.5 font-bold text-slate-300 sm:px-5">
                      {i + 1}
                    </td>
                    <td className="max-w-[10rem] truncate py-2.5 font-medium text-slate-700 sm:max-w-none">
                      {c.name}
                    </td>
                    <td className="hidden py-2.5 text-right text-xs text-slate-400 sm:table-cell">
                      {c.submitted} submitted
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-emerald-700 sm:px-5">
                      {c.validated} validated
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ④ Recent activity + ⑦ shortcuts */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent activity" subtitle="Last 20 audit-trail events system-wide" />
          <ul className="divide-y divide-slate-50">
            {recentAudit(20).map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm sm:flex-row sm:items-baseline sm:gap-3 sm:px-5">
                <span className="shrink-0 font-mono text-[10px] text-slate-300">
                  {timeAgo(e.timestamp)}
                </span>
                <span className="shrink-0 font-semibold text-slate-700">
                  {e.actorId === "system" ? "System" : (userById(e.actorId)?.name ?? e.actorId)}
                </span>
                <span className="min-w-0 break-words text-xs text-slate-500">
                  {e.action}
                  {e.detail ? ` — ${e.detail}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Shortcut actions" />
          <div className="grid grid-cols-2 gap-3 p-5">
            {[
              { href: "/dashboard/credentials", label: "Issue Credential", icon: "🔑" },
              { href: "/dashboard/users", label: "Create User", icon: "👤" },
              { href: "/dashboard/export", label: "Trigger Export", icon: "⇩" },
              { href: "/dashboard/audit", label: "Audit Log", icon: "🛡" },
              { href: "/dashboard/config", label: "System Config", icon: "⚙" },
              { href: "/dashboard/quick-input", label: "Quick Input", icon: "✎" },
            ].map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-4 text-center text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <span className="text-xl">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
          <p className="px-5 pb-4 text-[11px] leading-relaxed text-slate-400">
            Note: routine Quick Input use by the Platform Architect requires
            Lexical Committee permission (SRS §3.3); emergency corrections are
            always available.
          </p>
        </Card>
      </div>
      <p className="text-right text-xs text-slate-300">
        Signed in as {session.name} · {ROLE_LABEL[session.role]}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* System Moderator dashboard (SRS §7.2.1)                             */
/* ------------------------------------------------------------------ */

export function ModeratorDashboard({ session }: { session: Session }) {
  const now = nowMs();
  const counts = countsByState();
  const underReviewOld = store.submissions.filter(
    (s) =>
      s.state === "UNDER_REVIEW" &&
      now - new Date(s.updatedAt).getTime() > 30 * 24 * 3600 * 1000
  ).length;
  const arbitration = store.cases.filter((c) => c.status !== "RESOLVED");
  const ties = store.cases.filter((c) => c.status === "TIE_PENDING");
  const corrections = store.cases.filter(
    (c) => c.status === "RESOLVED" && c.correctionNote && !c.correctionApplied
  );
  const series = weeklySubmissionSeries(5).map((b) => ({
    label: b.label,
    value: b.value,
  }));

  return (
    <div className="space-y-6">
      {/* ① Queue health cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Pending review" value={counts.PENDING_REVIEW} tone="blue" href="/dashboard/queue?state=PENDING_REVIEW" />
        <StatCard label="Under review" value={counts.UNDER_REVIEW} tone="orange" href="/dashboard/queue?state=UNDER_REVIEW" />
        <StatCard label="Editor approved" value={counts.EDITOR_APPROVED} tone="purple" href="/dashboard/queue?state=EDITOR_APPROVED" />
        <StatCard label="Arbitration" value={counts.ARBITRATION} tone="purple" href="/dashboard/arbitration" />
        <StatCard label="Flagged" value={counts.FLAGGED} tone="amber" href="/dashboard/queue?state=FLAGGED" />
      </div>

      {/* ② UNDER_REVIEW alert */}
      {counts.UNDER_REVIEW > 0 ? (
        <Link
          href="/dashboard/queue?state=UNDER_REVIEW"
          className="block rounded-2xl border border-orange-300 bg-orange-50 px-5 py-4 transition hover:bg-orange-100"
        >
          <p className="text-sm font-bold text-orange-800">
            🛑 {counts.UNDER_REVIEW} entr{counts.UNDER_REVIEW === 1 ? "y" : "ies"} held by
            the anti-bot system — clearance required
          </p>
          <p className="mt-0.5 text-xs text-orange-700">
            {underReviewOld > 0
              ? `${underReviewOld} older than 30 days (highlighted red in the queue).`
              : "Click to open the clearance interface."}
          </p>
        </Link>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ③ Arbitration entries panel */}
        <Card>
          <CardHeader
            title="Arbitration cases"
            subtitle="All open cases with live vote tallies"
            action={
              <Link href="/dashboard/arbitration" className="text-xs font-semibold text-emerald-700 hover:underline">
                View all →
              </Link>
            }
          />
          <ul className="divide-y divide-slate-50">
            {arbitration.length === 0 ? (
              <li className="px-5 py-6 text-sm italic text-slate-400">
                No open arbitration cases.
              </li>
            ) : (
              arbitration.map((c) => {
                const sub = store.submissions.find((s) => s.id === c.submissionId);
                const q = quorumInfo(c);
                return (
                  <li key={c.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Link
                        href={`/dashboard/arbitration/${c.id}`}
                        className="font-bengali font-bold text-slate-800 hover:text-emerald-700"
                      >
                        {sub?.writtenForm}
                      </Link>
                      <span className="text-xs text-slate-400">
                        {c.disputeType.replaceAll("_", " ").toLowerCase()} · opened {timeAgo(c.openedAt)}
                      </span>
                      <span className="ml-auto rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-200">
                        {c.status === "RESPONSE_WINDOW"
                          ? "response window"
                          : `${q.cast}/${q.needed} votes · ${q.approve}A ${q.reject}R`}
                      </span>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </Card>

        {/* ④ Tie-breaker pending */}
        <Card className={ties.length > 0 ? "ring-2 ring-purple-300" : ""}>
          <CardHeader
            title="Tie-breaker pending"
            subtitle="Cases that closed with a draw — your verdict required"
          />
          {ties.length === 0 ? (
            <p className="px-5 py-6 text-sm italic text-slate-400">
              No tie votes awaiting your verdict.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {ties.map((c) => {
                const sub = store.submissions.find((s) => s.id === c.submissionId);
                return (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="font-bengali font-bold">{sub?.writtenForm}</span>
                    <Link
                      href={`/dashboard/arbitration/${c.id}`}
                      className="ml-auto rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800"
                    >
                      Cast verdict →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <CardHeader
            title="Pending corrections"
            subtitle="Panel-approved entries needing minimal correction"
          />
          {corrections.length === 0 ? (
            <p className="px-5 py-4 text-sm italic text-slate-400">
              No corrections pending.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50 pb-2">
              {corrections.map((c) => {
                const sub = store.submissions.find((s) => s.id === c.submissionId);
                return (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="font-bengali font-bold">{sub?.writtenForm}</span>
                    <span className="truncate text-xs text-slate-400">{c.correctionNote}</span>
                    <Link href="/dashboard/corrections" className="ml-auto text-xs font-semibold text-emerald-700 hover:underline">
                      Apply →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ⑤ Throughput chart */}
        <Card>
          <CardHeader title="Pipeline throughput" subtitle="Submissions per week (last 5 weeks)" />
          <div className="p-5">
            <ColumnChart data={series} />
          </div>
        </Card>

        {/* ⑦ Recent audit events */}
        <Card>
          <CardHeader title="Recent queue events" subtitle="State changes, arbitration and suspensions" />
          <ul className="divide-y divide-slate-50">
            {recentAudit(8, ["SUBMISSION", "ARBITRATION", "USER"]).map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm sm:flex-row sm:items-baseline sm:gap-3 sm:px-5">
                <span className="shrink-0 font-mono text-[10px] text-slate-300">{timeAgo(e.timestamp)}</span>
                <span className="min-w-0 break-words text-xs text-slate-600">
                  <strong>{e.actorId === "system" ? "System" : (userById(e.actorId)?.name ?? e.actorId)}</strong>{" "}
                  {e.action} {e.detail ? `— ${e.detail}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ⑥ anomaly + ⑧ shortcuts */}
      <Card>
        <CardHeader title="Shortcut actions" />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { href: "/dashboard/queue?state=UNDER_REVIEW", label: "Clear Under-Review", icon: "🧹" },
            { href: "/dashboard/queue", label: "Assign Entries", icon: "📌" },
            { href: "/dashboard/quick-input", label: "Direct Approval", icon: "⚡" },
            { href: "/dashboard/arbitration", label: "Tie-Breakers", icon: "⚖" },
            { href: "/dashboard/corrections", label: "Corrections", icon: "🩹" },
            { href: "/dashboard/audit", label: "Audit Log", icon: "🛡" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-4 text-center text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <span className="text-xl">{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </Card>
      <p className="text-right text-xs text-slate-300">
        Signed in as {session.name} · {ROLE_LABEL[session.role]} · Anomaly
        alert threshold: {store.config.anomalyThresholdPerHour} entries/hour
      </p>
    </div>
  );
}

export function statePill(state: keyof ReturnType<typeof countsByState>) {
  return (
    <span className="inline-flex items-center gap-1">
      <StateBadge state={state} /> {STATE_LABEL[state]}
    </span>
  );
}
