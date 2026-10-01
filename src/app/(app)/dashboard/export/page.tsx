import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store, userById } from "@/lib/store";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Card, CardHeader, PageTitle } from "@/components/ui";
import { ExportPanel } from "@/components/dashboard/ExportPanel";

export const metadata: Metadata = { title: "XML Export" };

export default async function ExportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "xml_export")) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="UKC LMF XML Export"
        subtitle="Generates a well-formed LMF file in the exact format of Bangla_Mono_Lingual_Lexicons.xml from the lexicon: the imported XML data plus every entry that passed final validation, each with its permanent ID. Run a dry run to see the current counts."
      />

      <Card>
        <CardHeader
          title="Export configuration"
          subtitle="Restricted to the Platform Architect and System Moderator"
        />
        <div className="p-5">
          <ExportPanel />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Export audit log"
          subtitle="Permanently retained — not deletable via the UI"
        />
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-semibold">Timestamp</th>
                <th className="px-3 py-3 font-semibold">Actor</th>
                <th className="px-3 py-3 font-semibold">Entries</th>
                <th className="px-3 py-3 font-semibold">Synsets</th>
                <th className="px-3 py-3 font-semibold">SHA-256</th>
                <th className="px-5 py-3 font-semibold">Config</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...store.exports].reverse().map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {formatDateTime(e.timestamp)}
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-slate-700">
                    {userById(e.actorId)?.name}
                  </td>
                  <td className="px-3 py-3 text-xs tabular-nums">
                    {formatNumber(e.entryCount)}
                  </td>
                  <td className="px-3 py-3 text-xs tabular-nums">
                    {formatNumber(e.synsetCount)}
                  </td>
                  <td className="px-3 py-3 font-mono text-[10px] text-slate-400">
                    {e.sha256.slice(0, 16)}…
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">{e.config}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h3 className="font-bold text-slate-800">UKC integration workflow</h3>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed">
          <li>Configure and generate the export above (dry-run first to verify projected counts).</li>
          <li>The system validates the XML against the UKC LMF schema before download.</li>
          <li>Transfer the file to the UKC import pipeline (manual or automated upload).</li>
          <li>The UKC merges entries, resolving conflicts against existing Bengali data by ILI code.</li>
          <li>Merge conflicts or quality flags are fed back to the Platform Architect for status updates.</li>
        </ol>
      </div>
    </div>
  );
}
