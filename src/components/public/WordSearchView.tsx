"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { SearchBox } from "@/components/public/SearchBox";
import { LocalizedPosBadge } from "@/components/LocalizedPosBadge";
import { WordLink } from "@/components/WordLink";
import {
  CrowdsourcedBadge,
  LexiconUnavailable,
  ResultRange,
} from "@/components/public/LexiconBits";
import { EmptyState, IdChip, Pagination } from "@/components/ui";
import type { WordSearchResult } from "@/lib/lexicon-api";
import type { POS } from "@/lib/types";

const ALL_POS: POS[] = ["n", "v", "a", "r"];

const MATCH_STYLE = {
  exact: { border: "border-l-emerald-600", chip: "bg-emerald-50 text-emerald-700", label: "exactMatch" },
  prefix: { border: "border-l-sky-400", chip: "bg-sky-50 text-sky-700", label: "prefixMatch" },
  contains: { border: "border-l-slate-300", chip: "bg-slate-100 text-slate-600", label: "containsMatch" },
} as const;

export function WordSearchView({
  q,
  posFilter,
  showIds,
  result,
  error,
}: {
  q: string;
  posFilter: POS[];
  showIds: boolean;
  result: WordSearchResult | null;
  error: string | null;
}) {
  const { t } = useI18n();

  const href = (next: { pos?: POS[]; page?: number }) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    const pos = next.pos ?? posFilter;
    if (pos.length) qs.set("pos", pos.join(","));
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    return `/search?${qs.toString()}`;
  };

  const togglePos = (pos: POS) =>
    posFilter.includes(pos) ? posFilter.filter((p) => p !== pos) : [...posFilter, pos];

  const chip = (on: boolean) =>
    `inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${
      on
        ? "bg-emerald-700 text-white ring-emerald-700"
        : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
    }`;

  return (
    <div className="py-6">
      <SearchBox initialQuery={q} target="/search" />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("filterByPos")}:
        </span>
        <Link href={href({ pos: [], page: 1 })} className={chip(posFilter.length === 0)}>
          {t("allPos")}
        </Link>
        {ALL_POS.map((p) => (
          <Link
            key={p}
            href={href({ pos: togglePos(p), page: 1 })}
            className={chip(posFilter.includes(p))}
            aria-pressed={posFilter.includes(p)}
          >
            {t(`pos_${p}`)}
          </Link>
        ))}
      </div>

      {!q ? (
        <p className="mt-10 text-center text-sm text-slate-400">{t("searchHint")}</p>
      ) : error ? (
        <div className="mt-8">
          <LexiconUnavailable message={error} />
        </div>
      ) : !result || result.total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`${t("noResultsFor")} “${q}”`}
            message={t("noResultsHint")}
          />
        </div>
      ) : (
        <>
          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span>
              {formatNumber(result.total)}{" "}
              {result.total === 1 ? t("result") : t("results")} —
            </span>
            <span className="font-semibold text-emerald-700">
              {formatNumber(result.counts.exact)} {t("exact")}
            </span>
            <span aria-hidden>·</span>
            <span className="font-semibold text-sky-700">
              {formatNumber(result.counts.prefix)} {t("prefix")}
            </span>
            {result.counts.contains > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="font-semibold text-slate-600">
                  {formatNumber(result.counts.contains)} {t("contains")}
                </span>
              </>
            ) : null}
            {result.totalPages > 1 ? (
              <span className="w-full text-xs text-slate-400 sm:ml-auto sm:w-auto">
                <ResultRange page={result.page} size={result.size} total={result.total} />
              </span>
            ) : null}
          </p>

          {result.items.length === 0 ? (
            <div className="mt-6">
              <EmptyState title={`${t("noResultsFor")} “${q}”`} message={t("noResultsHint")} />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {result.items.map((hit) => {
                const style = MATCH_STYLE[hit.matchType ?? "contains"];
                return (
                  <li
                    key={hit.id}
                    className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${style.border}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <WordLink
                        href={`/word/${hit.id}`}
                        className="font-bengali min-w-0 break-words text-xl font-bold text-slate-900 hover:text-emerald-700"
                      >
                        {hit.lemma}
                      </WordLink>
                      <LocalizedPosBadge pos={hit.pos} />
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.chip}`}
                      >
                        {t(style.label)}
                      </span>
                      {hit.crowdsourced ? <CrowdsourcedBadge validatedAt={hit.validatedAt} /> : null}
                      {hit.senseCount > 1 ? (
                        <span className="text-xs text-slate-400">
                          {hit.senseCount} {t("sensesPolysemous")}
                        </span>
                      ) : null}
                      {showIds ? (
                        <>
                          <IdChip id={hit.id} />
                          {hit.synsetId ? <IdChip id={hit.synsetId} /> : null}
                        </>
                      ) : null}
                      <WordLink
                        href={`/word/${hit.id}`}
                        className="ml-auto shrink-0 text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        {t("showDetails")}
                      </WordLink>
                    </div>
                    {hit.definition ? (
                      <p className="font-bengali mt-1.5 line-clamp-2 text-sm text-slate-600">
                        {hit.definition}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <Pagination
            page={Math.min(result.page, result.totalPages)}
            totalPages={result.totalPages}
            hrefFor={(p) => href({ page: p })}
          />
        </>
      )}
    </div>
  );
}
