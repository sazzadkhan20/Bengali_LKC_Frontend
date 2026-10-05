import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { formatDateTime, formatNumber, ROLE_LABEL, timeAgo } from "@/lib/format";
import type { Role } from "@/lib/types";
import { Card, EmptyState, PageTitle } from "@/components/ui";
import { DashboardUnavailable, humanizeAction } from "@/components/dashboard/DashboardParts";

export const metadata: Metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

const TYPE_STYLE: Record<string, string> = {
  SUBMISSION: "bg-sky-50 text-sky-700 ring-sky-200",
  ARBITRATION: "bg-purple-50 text-purple-700 ring-purple-200",
  USER: "bg-rose-50 text-rose-700 ring-rose-200",
  CREDENTIAL: "bg-amber-50 text-amber-800 ring-amber-200",
  AUTH: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  COMMUNITY: "bg-teal-50 text-teal-700 ring-teal-200",
  EXPORT: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CONFIG: "bg-slate-100 text-slate-600 ring-slate-200",
};
const TYPE_LABEL: Record<string, string> = {
  SUBMISSION: "Submissions",
  ARBITRATION: "Arbitration",
  USER: "Accounts",
  CREDENTIAL: "Credentials",
  AUTH: "Sign-ins",
  COMMUNITY: "Community",
  EXPORT: "Exports",
  CONFIG: "Configuration",
};
const FILTER_KEYS = ["type", "action", "actor", "q", "from", "to"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type Params = Partial<Record<FilterKey | "page", string>>;

interface AuditItem {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: string | null;
}
interface Facet {
  value: string;
  count: number;
}
interface AuditPage {
  items: AuditItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  facets: { types: Facet[]; actions: Facet[]; actors: { value: string; label: string; role: string }[] };
}

function targetHref(e: AuditItem): string | null {
  if (!e.targetId) return null;
  if (e.targetType === "SUBMISSION" && e.targetId.startsWith("sub-")) return `/dashboard/submissions/${e.targetId}`;
  if (e.targetType === "ARBITRATION" && e.targetId.startsWith("case-")) return `/dashboard/arbitration/${e.targetId}`;
  if (e.targetType === "USER" && e.targetId.startsWith("u-")) return `/dashboard/community/profile/${e.targetId}`;
  return null;
}

function roleLabel(role: string): string {
  return role === "SYSTEM" ? "Automated" : (ROLE_LABEL[role as Role] ?? role);
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "audit_log")) redirect("/dashboard");

  const params = await searchParams;
  const filters: Partial<Record<FilterKey, string>> = {};
  for (const key of FILTER_KEYS) {
    const v = params[key]?.trim();
    if (v) filters[key] = v;
  }
  const page = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0);

  const qs = new URLSearchParams({ ...filters, page: String(page), size: "50" });
  const res = await backendAuthedFetch<AuditPage & { error?: string }>(`/api/audit?${qs}`, { cache: "no-store" });
  const data = res.ok ? res.data : null;
  const filterError = !res.ok && res.status === 422 ? (res.data?.error ?? "Invalid filter.") : null;

  const href = (patch: Params) => {
    const next = new URLSearchParams();
    const merged: Params = { ...filters, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const s = next.toString();
    return `/dashboard/audit${s ? `?${s}` : ""}`;
  };
  const downloadQs = new URLSearchParams(filters as Record<string, string>).toString();
  const activeCount = Object.keys(filters).length;
  const totalAll = data?.facets.types.reduce((sum, t) => sum + t.count, 0) ?? 0;

  const chip = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
      active ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
    }`;
  const input =
    "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title="Audit Log"
        subtitle="Tamper-evident trail of every state transition, sign-in, account and credential change, export, configuration change and arbitration decision. Retained indefinitely."
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/audit/download?fmt=csv${downloadQs ? `&${downloadQs}` : ""}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ⇩ CSV
            </a>
            <a
              href={`/api/audit/download?fmt=json${downloadQs ? `&${downloadQs}` : ""}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ⇩ JSON
            </a>
          </div>
        }
      />

      {data ? (
        <nav aria-label="Event types" className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <Link href={href({ type: undefined, page: undefined })} className={chip(!filters.type)} aria-current={!filters.type ? "page" : undefined}>
            All <span className="tabular-nums opacity-70">{formatNumber(totalAll)}</span>
          </Link>
          {data.facets.types.map((t) => (
            <Link
              key={t.value}
              href={href({ type: t.value, page: undefined })}
              className={chip(filters.type === t.value)}
              aria-current={filters.type === t.value ? "page" : undefined}
            >
              {TYPE_LABEL[t.value] ?? t.value} <span className="tabular-nums opacity-70">{formatNumber(t.count)}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      <Card className="mb-4">
        <form method="get" action="/dashboard/audit" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Search</span>
            <input name="q" defaultValue={filters.q} placeholder="Detail, entry id, user…" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Event</span>
            <select name="action" defaultValue={filters.action ?? ""} className={input}>
              <option value="">All events</option>
              {data?.facets.actions.map((a) => (
                <option key={a.value} value={a.value}>
                  {humanizeAction(a.value)} ({a.count})
                </option>
              ))}
              {filters.action && !data?.facets.actions.some((a) => a.value === filters.action) ? (
                <option value={filters.action}>{humanizeAction(filters.action)}</option>
              ) : null}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Actor</span>
            <select name="actor" defaultValue={filters.actor ?? ""} className={input}>
              <option value="">Anyone</option>
              {data?.facets.actors.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                  {a.role && a.role !== "SYSTEM" ? ` · ${roleLabel(a.role)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-2">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold text-slate-500">From</span>
              <input type="date" name="from" defaultValue={filters.from} className={input} />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold text-slate-500">To</span>
              <input type="date" name="to" defaultValue={filters.to} className={input} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Apply filters
            </button>
            {activeCount > 0 ? (
              <Link
                href="/dashboard/audit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear all
              </Link>
            ) : null}
            <span className="text-xs text-slate-400">Dates use Bangladesh time (UTC+6). Downloads include every matching event.</span>
          </div>
        </form>
      </Card>

      {filterError ? (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200">
          {filterError}
        </p>
      ) : null}

      {!data ? (
        filterError ? null : <DashboardUnavailable />
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            title="No matching events"
            message={activeCount > 0 ? "Try removing a filter or widening the date range." : "Audit events will appear here as the platform is used."}
          />
        </Card>
      ) : (
        <>
          <Card>
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">Time</th>
                    <th scope="col" className="px-4 py-3 font-bold">Actor</th>
                    <th scope="col" className="px-4 py-3 font-bold">Event</th>
                    <th scope="col" className="px-4 py-3 font-bold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.items.map((e) => {
                    const link = targetHref(e);
                    return (
                      <tr key={e.id} className="align-top hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-3">
                          <time dateTime={e.timestamp} className="block text-xs font-medium text-slate-700">
                            {formatDateTime(e.timestamp)}
                          </time>
                          <span className="text-[11px] text-slate-400">{timeAgo(e.timestamp)}</span>
                        </td>
                        <td className="px-4 py-3">
                          {e.actorId && e.actorId !== "system" ? (
                            <Link href={href({ actor: e.actorId, page: undefined })} className="block font-semibold text-slate-700 hover:text-emerald-700 hover:underline">
                              {e.actorName}
                            </Link>
                          ) : (
                            <span className="block font-semibold text-slate-700">{e.actorName ?? "System"}</span>
                          )}
                          <span className="text-[11px] text-slate-400">{roleLabel(e.actorRole)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${TYPE_STYLE[e.targetType] ?? TYPE_STYLE.CONFIG}`}>
                            {TYPE_LABEL[e.targetType] ?? e.targetType}
                          </span>
                          <Link href={href({ action: e.action, page: undefined })} className="mt-1 block text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:underline">
                            {humanizeAction(e.action)}
                          </Link>
                          {e.targetId ? (
                            link ? (
                              <Link href={link} className="font-mono text-[11px] text-emerald-700 hover:underline">
                                {e.targetId}
                              </Link>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-400">{e.targetId}</span>
                            )
                          ) : null}
                        </td>
                        <td className="max-w-md px-4 py-3">
                          <p className="font-bengali break-words text-xs leading-relaxed text-slate-600">{e.detail || "—"}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((e) => {
                const link = targetHref(e);
                return (
                  <li key={e.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${TYPE_STYLE[e.targetType] ?? TYPE_STYLE.CONFIG}`}>
                        {TYPE_LABEL[e.targetType] ?? e.targetType}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{humanizeAction(e.action)}</span>
                      <time dateTime={e.timestamp} title={formatDateTime(e.timestamp)} className="ml-auto text-[11px] text-slate-400">
                        {timeAgo(e.timestamp)}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{e.actorName ?? "System"}</span> · {roleLabel(e.actorRole)}
                      {e.targetId ? (
                        <>
                          {" · "}
                          {link ? (
                            <Link href={link} className="font-mono text-emerald-700 hover:underline">
                              {e.targetId}
                            </Link>
                          ) : (
                            <span className="font-mono">{e.targetId}</span>
                          )}
                        </>
                      ) : null}
                    </p>
                    {e.detail ? <p className="font-bengali mt-1 break-words text-xs leading-relaxed text-slate-600">{e.detail}</p> : null}
                  </li>
                );
              })}
            </ul>
          </Card>

          <nav aria-label="Pagination" className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-slate-500">
              Showing {formatNumber(data.page * data.size + 1)}–{formatNumber(data.page * data.size + data.items.length)} of{" "}
              {formatNumber(data.totalElements)} event{data.totalElements === 1 ? "" : "s"}
            </p>
            {data.totalPages > 1 ? (
              <div className="flex items-center gap-2">
                {data.page > 0 ? (
                  <Link href={href({ page: String(data.page - 1) })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    ← Newer
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-300">← Newer</span>
                )}
                <span className="text-xs tabular-nums text-slate-500">
                  Page {data.page + 1} of {formatNumber(data.totalPages)}
                </span>
                {data.page + 1 < data.totalPages ? (
                  <Link href={href({ page: String(data.page + 1) })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Older →
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-300">Older →</span>
                )}
              </div>
            ) : null}
          </nav>
        </>
      )}
    </div>
  );
}
