import Link from "next/link";
import type { ReactNode } from "react";
import { ROLE_LABEL, STATE_LABEL, timeAgo } from "@/lib/format";
import { STATUS_LABEL, STATUS_STYLE, outcomeLabel } from "@/lib/arbitration";
import type { ActivityEvent, DashCase, Decision } from "@/lib/dashboard";

export function humanizeAction(action: string): string {
  const transition = /^STATE (\w+) → (\w+)$/.exec(action);
  if (transition) {
    const label = (s: string) => STATE_LABEL[s as keyof typeof STATE_LABEL] ?? s;
    return `${label(transition[1])} → ${label(transition[2])}`;
  }
  const text = action.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <li className="px-4 py-5 text-sm italic text-slate-400 sm:px-5">{children}</li>;
}

export function ActivityFeed({ events, empty }: { events: ActivityEvent[]; empty: string }) {
  return (
    <ul className="divide-y divide-slate-50">
      {events.length === 0 ? <EmptyRow>{empty}</EmptyRow> : null}
      {events.map((e) => (
        <li
          key={e.id}
          className="flex flex-col gap-0.5 px-4 py-2.5 text-sm sm:flex-row sm:items-baseline sm:gap-3 sm:px-5"
        >
          <time
            dateTime={e.at}
            title={new Date(e.at).toLocaleString("en-GB")}
            className="w-20 shrink-0 text-[11px] tabular-nums text-slate-400"
          >
            {timeAgo(e.at)}
          </time>
          <span className="min-w-0 text-xs text-slate-600">
            <strong className="font-semibold text-slate-800">
              {e.actorId ? (e.actorName ?? e.actorId) : "System"}
            </strong>
            {e.actorRole ? (
              <span className="text-slate-400"> · {ROLE_LABEL[e.actorRole] ?? e.actorRole}</span>
            ) : null}{" "}
            <span className="font-medium text-slate-700">{humanizeAction(e.action)}</span>
            {e.targetId ? <span className="font-mono text-[10px] text-slate-400"> {e.targetId}</span> : null}
            {e.detail ? <span className="block break-words text-slate-500">{e.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Status text for a case; open cases show progress counts only (verdicts are hidden until the panel closes). */
export function caseProgress(c: DashCase, now: number): string {
  switch (c.status) {
    case "RESPONSE_WINDOW":
      return c.responseDeadline && new Date(c.responseDeadline).getTime() > now
        ? `Response window · closes ${timeAgo(c.responseDeadline)}`
        : "Response window · closing at the next check";
    case "ACTIVE":
      return `${c.votesCast}/${c.quorum} votes for quorum`;
    case "TIE_PENDING":
      return "Tied — awaiting the System Moderator";
    case "RESOLVED":
      return outcomeLabel(c.status, c.finalVerdict, c.verdictBy, c.stage);
  }
}

export function CaseList({
  cases,
  empty,
  now,
  subtitle,
  action,
}: {
  cases: DashCase[];
  empty: string;
  now: number;
  subtitle?: (c: DashCase) => ReactNode;
  action?: (c: DashCase) => ReactNode;
}) {
  return (
    <ul className="divide-y divide-slate-50">
      {cases.length === 0 ? <EmptyRow>{empty}</EmptyRow> : null}
      {cases.map((c) => (
        <li key={c.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <Link
                href={`/dashboard/arbitration/${c.id}`}
                className="font-bengali text-base font-bold text-slate-800 hover:text-emerald-700"
              >
                {c.writtenForm}
              </Link>
              <span className="font-mono text-[10px] text-slate-400">{c.id}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {subtitle ? subtitle(c) : `${c.contributorName ?? "Contributor"} vs ${c.reviewerName ?? "reviewer"}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLE[c.status]}`}
              title={STATUS_LABEL[c.status]}
            >
              {caseProgress(c, now)}
            </span>
            {action ? action(c) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DecisionList({ decisions, empty }: { decisions: Decision[]; empty: string }) {
  return (
    <ul className="divide-y divide-slate-50">
      {decisions.length === 0 ? <EmptyRow>{empty}</EmptyRow> : null}
      {decisions.map((d) => (
        <li
          key={`${d.submissionId}-${d.at}-${d.toState}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm sm:px-5"
        >
          <Link
            href={`/dashboard/submissions/${d.submissionId}`}
            className="font-bengali min-w-0 font-semibold text-slate-700 hover:text-emerald-700"
          >
            {d.writtenForm}
          </Link>
          <span className="text-[11px] text-slate-500">
            {STATE_LABEL[d.fromState]} <span className="text-slate-300">→</span>{" "}
            <strong className="font-semibold text-slate-700">{STATE_LABEL[d.toState]}</strong>
          </span>
          <time dateTime={d.at} className="ml-auto shrink-0 text-[11px] text-slate-400">
            {timeAgo(d.at)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export function MiniStats({ items }: { items: { label: string; value: number; cls: string }[] }) {
  return (
    <div
      className="grid gap-2 p-4 sm:gap-3 sm:p-5"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((c) => (
        <div key={c.label} className="rounded-xl bg-slate-50 p-3 text-center sm:p-4">
          <p className={`text-xl font-bold tabular-nums sm:text-2xl ${c.cls}`}>{c.value}</p>
          <p className="text-[10px] text-slate-500 sm:text-xs">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

export function QuotaBar({
  label,
  used,
  limit,
  hint,
  color,
}: {
  label: string;
  used: number;
  limit: number;
  hint?: string;
  color: string;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const full = limit > 0 && used >= limit;
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap justify-between gap-x-3 text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className={`tabular-nums ${full ? "font-semibold text-red-700" : "text-slate-500"}`}>
          {used} / {limit}
          {full ? " · limit reached" : ""}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
      >
        <div className={`h-full rounded-full ${full ? "bg-red-500" : color}`} style={{ width: `${pct}%` }} />
      </div>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function Shortcuts({
  items,
  className = "grid-cols-2",
}: {
  items: { href: string; label: string; icon: string }[];
  className?: string;
}) {
  return (
    <div className={`grid gap-3 p-4 sm:p-5 ${className}`}>
      {items.map((a) => (
        <Link
          key={a.href + a.label}
          href={a.href}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-4 text-center text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <span className="text-xl" aria-hidden>
            {a.icon}
          </span>
          {a.label}
        </Link>
      ))}
    </div>
  );
}

export function ViewAll({ href, children = "View all →" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="text-xs font-semibold text-emerald-700 hover:underline">
      {children}
    </Link>
  );
}

export function DashboardUnavailable() {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-800">
      <p className="font-semibold">Your dashboard could not be loaded.</p>
      <p className="mt-1 text-red-700">
        The server did not respond. Refresh the page in a moment; if the problem continues, contact the
        Platform Architect.
      </p>
    </div>
  );
}

export function formatAge(hours: number): string {
  if (hours < 1) return "< 1h";
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
