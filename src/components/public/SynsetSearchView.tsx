"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatNumber, REL_LABEL } from "@/lib/format";
import { SearchBox } from "@/components/public/SearchBox";
import { LocalizedPosBadge } from "@/components/LocalizedPosBadge";
import {
  CrowdsourcedBadge,
  LexiconUnavailable,
  ResultRange,
} from "@/components/public/LexiconBits";
import { DefinitionList, EmptyState, IdChip, Pagination } from "@/components/ui";
import type { SynsetSearchResult } from "@/lib/lexicon-api";

export function SynsetSearchView({
  q,
  result,
  error,
}: {
  q: string;
  result: SynsetSearchResult | null;
  error: string | null;
}) {
  const { t } = useI18n();
  const href = (page: number) => {
    const qs = new URLSearchParams({ q });
    if (page > 1) qs.set("page", String(page));
    return `/search/synset?${qs.toString()}`;
  };

  return (
    <div className="py-6">
      <SearchBox initialQuery={q} target="/search/synset" suggest={false} />
      <p className="mt-3 text-xs text-slate-400">{t("synsetHint")}</p>

      {!q ? null : error ? (
        <div className="mt-8">
          <LexiconUnavailable message={error} />
        </div>
      ) : result?.tooShort ? (
        <p className="mt-8 text-center text-sm text-slate-500">{t("glossTooShort")}</p>
      ) : !result || result.total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`${t("noSynsetsMatch")} “${q}”`}
            message={t("synsetEmptyHint")}
          />
        </div>
      ) : (
        <>
          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span>
              {formatNumber(result.total)}{" "}
              {result.total === 1 ? t("result") : t("results")}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {result.mode === "id" ? "Synset ID" : result.mode === "ili" ? "ILI" : "Gloss"}
            </span>
            {result.totalPages > 1 ? (
              <span className="w-full text-xs text-slate-400 sm:ml-auto sm:w-auto">
                <ResultRange page={result.page} size={result.size} total={result.total} />
              </span>
            ) : null}
          </p>
          <ul className="mt-4 space-y-3">
            {result.items.map((hit) => (
              <li
                key={hit.synsetId}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/synset/${hit.synsetId}`}
                    className="break-all text-sm font-bold text-emerald-800 hover:underline"
                  >
                    {hit.synsetId}
                  </Link>
                  <LocalizedPosBadge pos={hit.pos} />
                  <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                    ILI {hit.ili}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {hit.lexicalized ? "Lexicalized" : "Not lexicalized"}
                  </span>
                  {hit.crowdsourced ? <CrowdsourcedBadge /> : null}
                  <Link
                    href={`/synset/${hit.synsetId}`}
                    className="ml-auto text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    {t("openSynset")}
                  </Link>
                </div>
                <DefinitionList
                  definitions={hit.definitions}
                  emptyLabel={t("noDefinitionYet")}
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-semibold">
                    {t("bengaliWords")} ({hit.entryCount}):
                  </span>{" "}
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
                {hit.relations && hit.relations.length > 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-semibold">{t("relationsLabel")}:</span>{" "}
                    {hit.relations.map((r, i) => (
                      <span key={`${r.target}-${i}`}>
                        {i > 0 ? " · " : ""}
                        {REL_LABEL[r.relType] ?? r.relType} →{" "}
                        <Link href={`/synset/${r.target}`}>
                          <IdChip id={r.target} />
                        </Link>
                      </span>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <Pagination
            page={Math.min(result.page, result.totalPages)}
            totalPages={result.totalPages}
            hrefFor={href}
          />
        </>
      )}
    </div>
  );
}
