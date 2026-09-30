import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store, userById } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Audit Log" };

const TYPE_STYLE: Record<string, string> = {
  SUBMISSION: "bg-sky-50 text-sky-700 ring-sky-200",
  USER: "bg-rose-50 text-rose-700 ring-rose-200",
  CREDENTIAL: "bg-amber-50 text-amber-800 ring-amber-200",
  EXPORT: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CONFIG: "bg-slate-100 text-slate-600 ring-slate-200",
  ARBITRATION: "bg-purple-50 text-purple-700 ring-purple-200",
  COMMUNITY: "bg-teal-50 text-teal-700 ring-teal-200",
  AUTH: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "audit_log")) redirect("/dashboard");

  const params = await searchParams;
  const typeFilter = params.type;
  const events = [...store.audit]
    .filter((e) => !typeFilter || e.targetType === typeFilter)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Audit Log"
        subtitle="Immutable, tamper-evident trail of every state transition, credential event, account change, export and arbitration decision. Retained indefinitely."
        action={
          <div className="flex gap-2">
            <a
              href="/api/audit/download?fmt=csv"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ⇩ Download CSV
            </a>
            <a
              href="/api/audit/download?fmt=json"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ⇩ Download JSON
            </a>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <a
          href="/dashboard/audit"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${!typeFilter ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-600 ring-slate-300"}`}
        >
          All
        </a>
        {Object.keys(TYPE_STYLE).map((t) => (
          <a
            key={t}
            href={`/dashboard/audit?type=${t}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${typeFilter === t ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-600 ring-slate-300"}`}
          >
            {t.toLowerCase()}
          </a>
        ))}
      </div>

      <Card>
        <ul className="divide-y divide-slate-50">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-sm">
              <span className="w-36 shrink-0 font-mono text-[11px] text-slate-400">
                {formatDateTime(e.timestamp)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${TYPE_STYLE[e.targetType]}`}
              >
                {e.targetType}
              </span>
              <span className="font-semibold text-slate-700">
                {e.actorId === "system" ? "System" : (userById(e.actorId)?.name ?? e.actorId)}
              </span>
              <span className="font-mono text-xs text-slate-500">{e.action}</span>
              {e.detail ? (
                <span className="font-bengali text-xs text-slate-400">
                  {e.detail}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-3 text-xs text-slate-400">{events.length} events.</p>
    </div>
  );
}
