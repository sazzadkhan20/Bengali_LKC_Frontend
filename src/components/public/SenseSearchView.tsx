"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { SearchBox } from "@/components/public/SearchBox";
import { LocalizedPosBadge } from "@/components/LocalizedPosBadge";
import { EmptyState, IdChip, LangBadge } from "@/components/ui";
import type { POS } from "@/lib/types";

export type SenseHitView = {
  entryId: string;
  lemma: string;
  pos: POS;
  senseId: string;
  synsetId: string;
  ili: string | null;
  synsetPos: POS | null;
  defLang: string | null;
  defText: string | null;
  relations: {
    relType: string;
    relLabel: string;
    target: string;
    targetLemma: string | null;
  }[];
};

export function SenseSearchView({
  q,
  hit,
}: {
  q: string;
  hit: SenseHitView | null;
}) {
  const { t } = useI18n();

  return (
    <div className="py-6">
      <SearchBox initialQuery={q} target="/search/sense" />
      <p className="mt-3 text-xs text-slate-400">{t("senseHint")}</p>

      {!q ? null : !hit ? (
        <div className="mt-8">
          <EmptyState
            title={`${t("noSenseFound")} “${q}”`}
            message={t("senseEmptyHint")}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/word/${hit.entryId}`}
              className="font-bengali text-2xl font-bold text-slate-900 hover:text-emerald-700"
            >
              {hit.lemma}
            </Link>
            <LocalizedPosBadge pos={hit.pos} />
            <IdChip id={hit.senseId} />
            <span className="text-xs text-slate-400">{t("belongsTo")}</span>
            <Link href={`/synset/${hit.synsetId}`}>
              <IdChip id={hit.synsetId} />
            </Link>
          </div>

          {hit.ili ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {t("parentSynset")}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-violet-700 ring-1 ring-inset ring-violet-200">
                  ILI {hit.ili}
                </span>
                {hit.synsetPos ? (
                  <LocalizedPosBadge pos={hit.synsetPos} />
                ) : null}
              </div>
              {hit.defText ? (
                <p className="font-bengali mt-2 text-sm text-slate-700">
                  {hit.defLang ? <LangBadge lang={hit.defLang} /> : null}{" "}
                  {hit.defText}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {t("senseRelations")}
            </p>
            {hit.relations.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {hit.relations.map((rel, i) => (
                  <li
                    key={`${rel.target}-${i}`}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="rounded bg-white px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-200">
                      {rel.relLabel}
                    </span>
                    {rel.targetLemma ? (
                      <Link
                        href={`/search/sense?q=${rel.target}`}
                        className="font-bengali font-semibold text-emerald-700 hover:underline"
                      >
                        {rel.targetLemma}
                      </Link>
                    ) : null}
                    <Link href={`/search/sense?q=${rel.target}`}>
                      <IdChip id={rel.target} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-sm italic text-slate-400">
                {t("noSenseRelations")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
