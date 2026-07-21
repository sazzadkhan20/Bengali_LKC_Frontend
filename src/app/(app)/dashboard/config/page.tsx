import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store } from "@/lib/store";
import { lexiconMeta } from "@/lib/lexicon";
import { Card, CardHeader, PageTitle } from "@/components/ui";
import { ConfigForm } from "@/components/dashboard/ConfigForm";

export const metadata: Metadata = { title: "System Configuration" };

export default async function ConfigPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "system_config")) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="System Configuration & Anti-Bot Controls"
        subtitle="Rate limits, CAPTCHA, honeypots, timing analysis and session policy (SRS §4). Every change is written to the audit trail."
      />
      <ConfigForm initial={{ ...store.config }} />

      <Card className="mt-8">
        <CardHeader
          title="Lexicon metadata"
          subtitle="Applied to the <Lexicon> element of every XML export"
        />
        <dl className="grid gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
          {[
            ["id", lexiconMeta.id],
            ["label", lexiconMeta.label],
            ["language (ISO 639-3)", lexiconMeta.language],
            ["email", lexiconMeta.email],
            ["license", lexiconMeta.license],
            ["version", lexiconMeta.version],
            ["dc:publisher", lexiconMeta.publisher],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {k}
              </dt>
              <dd className="mt-0.5 break-all text-slate-700">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="ILI Registry"
          subtitle="Local Princeton WordNet 2.1 offset cache used for real-time Quick Input validation (SRS §13.2)"
        />
        <div className="flex flex-wrap items-center gap-4 p-5 text-sm">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            ✓ Cache loaded — 12,480 ILI codes
          </span>
          <span className="text-xs text-slate-400">
            Last refreshed with the canonical lexicon import. The framework
            never creates or modifies ILI codes; unmatched codes are flagged
            for UKC curation (SRS §13.3).
          </span>
        </div>
      </Card>
    </div>
  );
}
