"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import type { LexiconStats } from "@/lib/lexicon-api";
import type { POS } from "@/lib/types";

const POS_ORDER: POS[] = ["n", "v", "a", "r"];

export function DictionaryLetterMeta({
  letter,
  count,
  page,
  totalPages,
}: {
  letter: string;
  count: number;
  page: number;
  totalPages: number;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <p className="text-sm text-slate-500">
        <span className="font-bengali text-xl font-bold text-slate-800">
          {letter}
        </span>{" "}
        — {formatNumber(count)} {t("entriesPageOf")} {page} {t("of")}{" "}
        {totalPages}
      </p>
      <p className="hidden text-xs text-slate-400 sm:block">
        {t("posLegend")}: {POS_ORDER.map((p) => t(`pos_${p}`)).join(" · ")}
      </p>
    </div>
  );
}

export function DictionaryPosFilter({
  active,
  hrefs,
}: {
  active: POS[];
  hrefs: Record<"all" | POS, string>;
}) {
  const { t } = useI18n();
  const chip = (on: boolean) =>
    `inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${
      on
        ? "bg-emerald-700 text-white ring-emerald-700"
        : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
    }`;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t("filterByPos")}:
      </span>
      <Link href={hrefs.all} className={chip(active.length === 0)}>
        {t("allPos")}
      </Link>
      {POS_ORDER.map((p) => (
        <Link
          key={p}
          href={hrefs[p]}
          className={chip(active.includes(p))}
          aria-pressed={active.includes(p)}
        >
          {t(`pos_${p}`)}
        </Link>
      ))}
    </div>
  );
}

export function DictionaryStats({ stats }: { stats: LexiconStats }) {
  const { t } = useI18n();
  const cards = [
    { label: "Validated entries", value: stats.entries, extra: stats.crowdsourcedEntries },
    { label: "Synsets", value: stats.synsets, extra: stats.crowdsourcedSynsets },
    { label: "Relations", value: stats.relations, extra: null },
    { label: "Word senses", value: stats.senses, extra: stats.crowdsourcedSenses },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <p className="text-lg font-bold tabular-nums text-emerald-800">
            {formatNumber(s.value)}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {s.label}
          </p>
          {s.extra ? (
            <p className="mt-0.5 text-[11px] text-amber-700">
              {formatNumber(s.extra)} {t("crowdsourced").toLowerCase()}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function DictionaryEmpty() {
  const { t } = useI18n();
  return (
    <EmptyState title={t("noEntriesLetter")} message={t("tryAnotherLetter")} />
  );
}
