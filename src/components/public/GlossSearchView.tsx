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
import { EmptyState, IdChip, LangBadge, Pagination } from "@/components/ui";
import type { GlossSearchResult } from "@/lib/lexicon-api";
import type { POS } from "@/lib/types";

const ALL_POS: POS[] = ["n", "v", "a", "r"];

export function GlossSearchView({
  q,
  posFilter,
  showIds,
  result,
  error,
}: {
  q: string;
  posFilter: POS[];
  showIds: boolean;
  result: GlossSearchResult | null;
  error: string | null;
}) {
  const { t } = useI18n();

  const href = (next: { pos?: POS[]; page?: number }) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    const pos = next.pos ?? posFilter;
    if (pos.length) qs.set("pos", pos.join(","));
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    return `/search/gloss?${qs.toString()}`;
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
      <SearchBox initialQuery={q} target="/search/gloss" suggest={false} />
      <p className="mt-3 text-xs text-slate-400">{t("glossHint")}</p>

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

      {!q ? null : error ? (
        <div className="mt-8">
          <LexiconUnavailable message={error} />
        </div>
      ) : result?.tooShort ? (
        <p className="mt-8 text-center text-sm text-slate-500">{t("glossTooShort")}</p>
      ) : !result || result.total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`${t("noDefsContain")} “${q}”`}
            message={t("glossEmptyHint")}
          />
        </div>
      ) : (
        <>
          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span>
              {formatNumber(result.total)}{" "}
              {result.total === 1 ? t("result") : t("results")}
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
                  <LocalizedPosBadge pos={hit.pos} />
                  {hit.crowdsourced ? <CrowdsourcedBadge /> : null}
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
                    {hit.defLang ? <LangBadge lang={hit.defLang} /> : null} {hit.defText}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-semibold">{t("wordsLabel")}:</span>{" "}
                  {hit.entries.length === 0 ? (
                    <span className="italic">{t("lexicalGap")}</span>
                  ) : (
                    <>
                      {hit.entries.map((e, i) => (
                        <span key={e.id}>
                          {i > 0 ? ", " : ""}
                          <WordLink
                            href={`/word/${e.id}`}
                            className="font-bengali text-sm font-semibold text-emerald-700 hover:underline"
                          >
                            {e.lemma}
                          </WordLink>
                        </span>
                      ))}
                      {hit.entryCount > hit.entries.length
                        ? ` ${t("synonymsMore").replace("{n}", String(hit.entryCount - hit.entries.length))}`
                        : ""}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
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
