import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { formatNumber } from "@/lib/format";
import { Card, CardHeader, PageTitle } from "@/components/ui";
import { ConfigForm, type ConfigView } from "@/components/dashboard/ConfigForm";
import { DashboardUnavailable } from "@/components/dashboard/DashboardParts";

export const metadata: Metadata = { title: "System Configuration" };
export const dynamic = "force-dynamic";

interface LexiconMeta {
  id: string;
  label: string;
  language: string;
  email: string | null;
  license: string | null;
  version: string | null;
  publisher: string | null;
  source: string | null;
  description: string | null;
  iliCodes: number;
}

export default async function ConfigPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "system_config")) redirect("/dashboard");

  const res = await backendAuthedFetch<ConfigView & { lexicon: LexiconMeta | null }>("/api/config", { cache: "no-store" });
  const data = res.ok ? res.data : null;
  const lexicon = data?.lexicon ?? null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="System Configuration"
        subtitle="Submission limits, anti-bot controls, session policy and Leader Board settings. Changes apply immediately and every change is written to the audit trail."
        action={
          <Link
            href="/dashboard/audit?type=CONFIG"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Change history →
          </Link>
        }
      />

      {!data ? (
        <DashboardUnavailable />
      ) : (
        <>
          <ConfigForm initial={{ config: data.config, meta: data.meta }} />

          {lexicon ? (
            <Card className="mt-6">
              <CardHeader title="Lexicon metadata" subtitle="Written to the <Lexicon> element of every XML export" />
              <dl className="grid gap-x-8 gap-y-4 p-4 text-sm sm:grid-cols-2 sm:p-5">
                {(
                  [
                    ["Lexicon id", lexicon.id],
                    ["Label", lexicon.label],
                    ["Language (ISO 639-3)", lexicon.language],
                    ["Version", lexicon.version],
                    ["Contact email", lexicon.email],
                    ["dc:publisher", lexicon.publisher],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{k}</dt>
                    <dd className="mt-0.5 break-words text-slate-700">{v || "—"}</dd>
                  </div>
                ))}
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">License</dt>
                  <dd className="mt-0.5 break-all text-slate-700">
                    {lexicon.license ? (
                      <a href={lexicon.license} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                        {lexicon.license}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                {lexicon.description ? (
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">dc:description</dt>
                    <dd className="mt-0.5 text-slate-600">{lexicon.description}</dd>
                  </div>
                ) : null}
                {lexicon.source ? (
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">dc:source</dt>
                    <dd className="mt-1">
                      <ul className="space-y-1 text-xs leading-relaxed text-slate-600">
                        {lexicon.source.split(";").map((s) => s.trim()).filter(Boolean).map((s) => (
                          <li key={s} className="break-words">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Card>
          ) : null}

          {lexicon ? (
            <Card className="mt-6">
              <CardHeader title="Interlingual Index (ILI)" subtitle="Used to validate ILI codes entered in Quick Input" />
              <div className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                <span className="inline-flex shrink-0 items-center self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {formatNumber(lexicon.iliCodes)} ILI codes in the lexicon
                </span>
                <span className="text-xs leading-relaxed text-slate-500">
                  The framework never creates or modifies ILI codes. Entries whose code matches an existing synset are
                  linked to it; unmatched codes are flagged for UKC curation.
                </span>
              </div>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
