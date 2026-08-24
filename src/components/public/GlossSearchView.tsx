"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { SearchBox } from "@/components/public/SearchBox";
import { LocalizedPosBadge } from "@/components/LocalizedPosBadge";
import { EmptyState, IdChip, LangBadge } from "@/components/ui";
import type { POS } from "@/lib/types";

export type GlossHit = {
  synsetId: string;
  pos: POS;
  ili: string;
  defLang: string | null;
  defText: string | null;
  entries: { id: string; lemma: string }[];
};

export function GlossSearchView({
  q,
  showIds,
  results,
}: {
  q: string;
  showIds: boolean;
  results: GlossHit[];
}) {
  const { t } = useI18n();

  return (
    <div className="py-6">
      <SearchBox initialQuery={q} target="/search/gloss" />
      <p className="mt-3 text-xs text-slate-400">{t("glossHint")}</p>

      {!q ? null : results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`${t("noDefsContain")} “${q}”`}
            message={t("glossEmptyHint")}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {results.map((hit) => (
            <li
              key={hit.synsetId}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <LocalizedPosBadge pos={hit.pos} />
                {showIds ? (
                  <>
                    <Link href={`/synset/${hit.synsetId}`}>
                      <IdChip id={hit.synsetId} />
                    </Link>
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                      ILI {hit.ili}
                    </span>
                  </>
                ) : null}
              </div>
              {hit.defText ? (
                <p className="font-bengali mt-2 text-sm leading-relaxed text-slate-700">
                  {hit.defLang ? <LangBadge lang={hit.defLang} /> : null}{" "}
                  {hit.defText}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-semibold">{t("wordsLabel")}:</span>{" "}
                {hit.entries.length === 0 ? (
                  <span className="italic">{t("lexicalGap")}</span>
                ) : (
                  hit.entries.map((e, i) => (
                    <span key={e.id}>
                      {i > 0 ? ", " : ""}
                      <Link
                        href={`/word/${e.id}`}
                        className="font-bengali text-sm font-semibold text-emerald-700 hover:underline"
                      >
                        {e.lemma}
                      </Link>
                    </span>
                  ))
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
