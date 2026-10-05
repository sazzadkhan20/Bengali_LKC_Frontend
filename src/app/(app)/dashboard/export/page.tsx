import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { formatDate, formatDateTime, formatNumber, ROLE_LABEL, timeAgo } from "@/lib/format";
import type { Role } from "@/lib/types";
import { Card, CardHeader, EmptyState, PageTitle } from "@/components/ui";
import { ExportPanel } from "@/components/dashboard/ExportPanel";

export const metadata: Metadata = { title: "XML Export" };
export const dynamic = "force-dynamic";

interface ExportItem {
  id: string;
  timestamp: string;
  scope: "ALL" | "NEW" | "XML" | "RANGE" | "USER";
  version: string | null;
  pos: string | null;
  rangeFrom: string | null;
  rangeTo: string | null;
  baselineAt: string | null;
  cutoffAt: string | null;
  entries: number;
  synsets: number;
  senses: number;
  platformSenses: number;
  bytes: number;
  sha256: string;
  actorId: string;
  actorName: string | null;
  actorRole: string | null;
}

interface ExportSummary {
  baseline: { exportId: string; at: string; actorName: string | null } | null;
  pendingNew: number;
  xmlSenses: number;
  platformSenses: number;
  firstPlatformDate: string | null;
  today: string;
  items: ExportItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const SCOPE_STYLE: Record<ExportItem["scope"], string> = {
  ALL: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  NEW: "bg-sky-50 text-sky-700 ring-sky-200",
  XML: "bg-slate-100 text-slate-600 ring-slate-200",
  RANGE: "bg-purple-50 text-purple-700 ring-purple-200",
  USER: "bg-amber-50 text-amber-800 ring-amber-200",
};

function scopeLabel(e: ExportItem): string {
  switch (e.scope) {
    case "NEW":
      return "New since last";
    case "XML":
      return "Original XML";
    case "RANGE":
      return "Date range";
    case "USER":
      return "Platform only";
    default:
      return "All data";
  }
}

function scopeDetail(e: ExportItem): string {
  if (e.scope === "RANGE" && e.rangeFrom && e.rangeTo) {
    return e.rangeFrom === e.rangeTo ? formatDate(e.rangeFrom) : `${formatDate(e.rangeFrom)} – ${formatDate(e.rangeTo)}`;
  }
  if (e.scope === "NEW") return e.baselineAt ? `after ${formatDateTime(e.baselineAt)}` : "first incremental export";
  return "";
}

function fileSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function posLabel(pos: string | null): string {
  return !pos || pos === "all" ? "All POS" : pos.toUpperCase().split("/").join(" · ");
}

export default async function ExportPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "xml_export")) redirect("/dashboard");

  const page = Math.max(0, Number.parseInt((await searchParams).page ?? "0", 10) || 0);
  const res = await backendAuthedFetch<ExportSummary>(`/api/export/summary?page=${page}&size=10`, { cache: "no-store" });
  const data = res.ok ? res.data : null;
  const latest = data?.page === 0 ? data.items[0] : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="UKC LMF XML Export"
        subtitle="Generates a well-formed LMF file in the exact format of Bangla_Mono_Lingual_Lexicons.xml from the live lexicon: the imported data plus every entry that passed final validation, each with its permanent ID."
      />

      {!data ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-800">
          <p className="font-semibold">The export service could not be reached.</p>
          <p className="mt-1 text-red-700">Refresh the page in a moment; if the problem continues, check that the backend is running.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">New since last export</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{formatNumber(data.pendingNew)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {data.baseline
                  ? `platform senses after ${data.baseline.exportId}`
                  : "platform senses — no previous export"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lexicon senses</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">
                {formatNumber(data.xmlSenses + data.platformSenses)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatNumber(data.xmlSenses)} original · {formatNumber(data.platformSenses)} from the platform
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Last export</p>
              {latest ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-slate-800" title={formatDateTime(latest.timestamp)}>
                    {timeAgo(latest.timestamp)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {scopeLabel(latest)} · {latest.actorName ?? latest.actorId}
                  </p>
                </>
              ) : data.totalElements === 0 ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-slate-800">Never</p>
                  <p className="mt-0.5 text-xs text-slate-500">No export has been generated yet</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  <Link href="/dashboard/export" className="font-semibold text-emerald-700 hover:underline">
                    See the latest →
                  </Link>
                </p>
              )}
            </div>
          </div>

          <Card>
            <CardHeader title="Export configuration" subtitle="Restricted to the Platform Architect and System Moderator" />
            <div className="p-5">
              <ExportPanel
                pendingNew={data.pendingNew}
                baselineAt={data.baseline?.at ?? null}
                baselineExportId={data.baseline?.exportId ?? null}
                today={data.today}
                firstPlatformDate={data.firstPlatformDate}
              />
            </div>
          </Card>

          <Card className="mt-6">
            <CardHeader
              title="Export history"
              subtitle={`${formatNumber(data.totalElements)} export${data.totalElements === 1 ? "" : "s"} · permanently retained, not deletable`}
            />
            {data.items.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title={data.totalElements === 0 ? "No exports yet" : "No exports on this page"}
                  message={
                    data.totalElements === 0
                      ? "Generated files will be listed here with their scope, counts and SHA-256 fingerprint."
                      : "This page is past the end of the history."
                  }
                />
              </div>
            ) : (
              <>
                <div className="thin-scroll relative hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3 font-semibold">Export</th>
                        <th className="px-3 py-3 font-semibold">Scope</th>
                        <th className="px-3 py-3 text-right font-semibold">Entries</th>
                        <th className="px-3 py-3 text-right font-semibold">Synsets</th>
                        <th className="px-3 py-3 text-right font-semibold">Platform</th>
                        <th className="px-3 py-3 font-semibold">File</th>
                        <th className="px-5 py-3 font-semibold">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.items.map((e) => (
                        <tr key={e.id} className="align-top">
                          <td className="px-5 py-3">
                            <p className="font-mono text-xs font-semibold text-slate-700">{e.id}</p>
                            <p className="text-xs text-slate-500">{formatDateTime(e.timestamp)}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SCOPE_STYLE[e.scope]}`}>
                              {scopeLabel(e)}
                            </span>
                            {scopeDetail(e) ? <p className="mt-1 text-[11px] text-slate-500">{scopeDetail(e)}</p> : null}
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              v{e.version ?? "—"} · {posLabel(e.pos)}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-700">{formatNumber(e.entries)}</td>
                          <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-700">{formatNumber(e.synsets)}</td>
                          <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-700">{formatNumber(e.platformSenses)}</td>
                          <td className="px-3 py-3">
                            <p className="text-xs text-slate-600">{fileSize(e.bytes)}</p>
                            <p className="font-mono text-[10px] text-slate-400" title={e.sha256}>
                              {e.sha256.slice(0, 16)}…
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <Link href={`/dashboard/community/profile/${e.actorId}`} className="text-xs font-medium text-slate-700 hover:text-emerald-700 hover:underline">
                              {e.actorName ?? e.actorId}
                            </Link>
                            {e.actorRole ? <p className="text-[11px] text-slate-400">{ROLE_LABEL[e.actorRole as Role] ?? e.actorRole}</p> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-slate-100 md:hidden">
                  {data.items.map((e) => (
                    <li key={e.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-700">{e.id}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SCOPE_STYLE[e.scope]}`}>
                          {scopeLabel(e)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(e.timestamp)} · {e.actorName ?? e.actorId}
                      </p>
                      {scopeDetail(e) ? <p className="text-[11px] text-slate-500">{scopeDetail(e)}</p> : null}
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                        {[
                          ["Entries", e.entries],
                          ["Synsets", e.synsets],
                          ["Platform", e.platformSenses],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-lg bg-slate-50 px-2 py-1.5">
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                            <dd className="text-sm font-bold tabular-nums text-slate-700">{formatNumber(Number(value))}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-2 break-all font-mono text-[10px] text-slate-400">
                        v{e.version ?? "—"} · {posLabel(e.pos)} · {fileSize(e.bytes)} · {e.sha256.slice(0, 24)}…
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {data.totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-500">
                  Showing {formatNumber(data.page * data.size + 1)}–{formatNumber(data.page * data.size + data.items.length)} of{" "}
                  {formatNumber(data.totalElements)}
                </p>
                <div className="flex items-center gap-2">
                  {data.page > 0 ? (
                    <Link href={`/dashboard/export${data.page - 1 ? `?page=${data.page - 1}` : ""}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      ← Newer
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-300">← Newer</span>
                  )}
                  <span className="text-xs tabular-nums text-slate-500">
                    Page {data.page + 1} of {formatNumber(data.totalPages)}
                  </span>
                  {data.page + 1 < data.totalPages ? (
                    <Link href={`/dashboard/export?page=${data.page + 1}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      Older →
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-300">Older →</span>
                  )}
                </div>
              </div>
            ) : null}
          </Card>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            <h3 className="font-bold text-slate-800">UKC integration workflow</h3>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed">
              <li>Dry-run the export to confirm the projected counts, then generate the file.</li>
              <li>For routine hand-offs use “New since last export”; each one starts exactly where the previous full or incremental export stopped.</li>
              <li>Verify the downloaded file against the SHA-256 fingerprint recorded in the history above.</li>
              <li>Transfer the file to the UKC import pipeline, which merges entries against existing Bengali data by ILI code.</li>
              <li>Merge conflicts or quality flags are fed back to the Platform Architect for follow-up.</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
