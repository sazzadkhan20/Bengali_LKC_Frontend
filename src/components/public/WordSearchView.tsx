"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { SearchBox } from "@/components/public/SearchBox";
import { LocalizedPosBadge } from "@/components/LocalizedPosBadge";
import { WordLink } from "@/components/WordLink";
import { EmptyState, IdChip } from "@/components/ui";
import type { POS } from "@/lib/types";

const ALL_POS: POS[] = ["n", "v", "a", "r"];

export type WordSearchHit = {
  id: string;
  lemma: string;
  pos: POS;
  matchType: "exact" | "prefix";
  defPreview: string | null;
  synsetId: string | null;
};

export function WordSearchView({
  q,
  posFilter,
  showIds,
  exactCount,
  results,
}: {
  q: string;
  posFilter: POS[];
  showIds: boolean;
  exactCount: number;
  results: WordSearchHit[];
}) {
  const { t } = useI18n();

  const posHref = (pos: POS) => {
    const next = posFilter.includes(pos)
      ? posFilter.filter((p) => p !== pos)
      : [...posFilter, pos];
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (next.length) qs.set("pos", next.join(","));
    return `/search?${qs.toString()}`;
  };

  return (
    <div className="py-6">
      <SearchBox initialQuery={q} target="/search" />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("filterByPos")}:
        </span>
        {ALL_POS.map((p) => (
          <Link
            key={p}
            href={posHref(p)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${
              posFilter.includes(p)
                ? "bg-emerald-700 text-white ring-emerald-700"
                : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
            }`}
          >
            {t(`pos_${p}`)}
          </Link>
        ))}
      </div>

      {!q ? (
        <p className="mt-10 text-center text-sm text-slate-400">
          {t("searchHint")}
        </p>
      ) : results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`${t("noResultsFor")} “${q}”`}
            message={t("noResultsHint")}
          />
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-500">
            {results.length}{" "}
            {results.length === 1 ? t("result") : t("results")} —{" "}
            <span className="font-semibold text-emerald-700">
              {exactCount} {t("exact")}
            </span>
            ,{" "}
            <span className="font-semibold text-sky-700">
              {results.length - exactCount} {t("prefix")}
            </span>
          </p>
          <ul className="mt-4 space-y-3">
            {results.map((hit) => (
              <li
                key={hit.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
                  hit.matchType === "exact"
                    ? "border-l-4 border-slate-200 border-l-emerald-600"
                    : "border-l-4 border-slate-200 border-l-sky-400"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <WordLink
                    href={`/word/${hit.id}`}
                    className="font-bengali text-xl font-bold text-slate-900 hover:text-emerald-700"
                  >
                    {hit.lemma}
                  </WordLink>
                  <LocalizedPosBadge pos={hit.pos} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      hit.matchType === "exact"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-sky-50 text-sky-700"
                    }`}
                  >
                    {hit.matchType === "exact"
                      ? t("exactMatch")
                      : t("prefixMatch")}
                  </span>
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
                {hit.defPreview ? (
                  <p className="font-bengali mt-1.5 text-sm text-slate-600">
                    {hit.defPreview}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
