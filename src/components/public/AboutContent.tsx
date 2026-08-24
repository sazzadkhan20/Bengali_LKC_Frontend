"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import type { Role } from "@/lib/types";

const ROLE_ORDER: Role[] = [
  "PLATFORM_ARCHITECT",
  "SYSTEM_MODERATOR",
  "CONTRIBUTOR",
  "LEXICAL_EDITOR",
  "CHIEF_LEXICAL_EDITOR",
  "ARBITRATION_CURATOR",
];

export function AboutContent({
  stats,
  lexiconId,
  lexiconVersion,
  publisher,
}: {
  stats: {
    totalEntries: number;
    totalSenses: number;
    totalSynsets: number;
    polysemousEntries: number;
  };
  lexiconId: string;
  lexiconVersion: string;
  publisher: string;
}) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {t("aboutTitle")}
      </h1>
      <p className="mt-4 leading-relaxed text-slate-600">{t("aboutP1")}</p>
      <p className="mt-3 leading-relaxed text-slate-600">{t("aboutP2")}</p>

      <h2 className="mt-10 text-xl font-bold text-slate-900">
        {t("currentSnapshot")}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("lexicalEntries"), value: stats.totalEntries },
          { label: t("senses"), value: stats.totalSenses },
          { label: t("synsets"), value: stats.totalSynsets },
          { label: t("polysemousWords"), value: stats.polysemousEntries },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center"
          >
            <p className="text-2xl font-bold tabular-nums text-emerald-800">
              {formatNumber(s.value)}
            </p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Seeded from <code className="font-mono">{lexiconId}</code> v
        {lexiconVersion}, published by {publisher}. Sources include IndoWordNet,
        Wiktionary, CogNet, MorphyNet and Princeton WordNet.
      </p>

      <h2 className="mt-10 text-xl font-bold text-slate-900">
        {t("aboutRolesTitle")}
      </h2>
      <div className="mt-4 space-y-3">
        {ROLE_ORDER.map((role) => (
          <div
            key={role}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <h3 className="text-sm font-bold text-emerald-800">
              {t(`role_${role}`)}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t(`roleDesc_${role}`)}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-emerald-800">
            {t("roleVisitor")}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{t("roleDescVisitor")}</p>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-bold text-slate-900">
        {t("aboutConceptTitle")}
      </h2>
      <p className="mt-3 leading-relaxed text-slate-600">
        {t("aboutConceptBody")}
      </p>

      <div className="mt-10 rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
        <h3 className="font-bengali text-lg font-bold text-emerald-900">
          {t("wantToContribute")}
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          {t("wantToContributeBody")}
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          {t("goToLogin")}
        </Link>
      </div>
    </div>
  );
}
