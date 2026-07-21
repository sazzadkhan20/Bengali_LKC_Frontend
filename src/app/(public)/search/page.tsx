import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { searchByWord, synsetById } from "@/lib/lexicon";
import { POS_LABEL } from "@/lib/format";
import { WordLink } from "@/components/WordLink";
import { SearchBox } from "@/components/public/SearchBox";
import { EmptyState, IdChip, PosBadge } from "@/components/ui";
import type { POS } from "@/lib/types";

export const metadata: Metadata = { title: "Word Search" };

const ALL_POS: POS[] = ["n", "v", "a", "r"];

export default async function WordSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pos?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const showIds = session !== null;
  const q = params.q?.trim() ?? "";
  const posFilter = (params.pos?.split(",").filter((p) =>
    ALL_POS.includes(p as POS)
  ) ?? []) as POS[];

  const results = q
    ? searchByWord(q, { pos: posFilter.length ? posFilter : undefined })
    : [];
  const exactCount = results.filter((r) => r.matchType === "exact").length;

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

      {/* POS filters (SRS §9.1.2) */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Filter by POS:
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
            {POS_LABEL[p]}
          </Link>
        ))}
      </div>

      {!q ? (
        <p className="mt-10 text-center text-sm text-slate-400">
          Type a Bengali word above — exact matches are listed first, then
          prefix matches.
        </p>
      ) : results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`No results for “${q}”`}
            message="Try a shorter prefix, or search by definition in the Gloss tab."
          />
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-500">
            {results.length} result{results.length === 1 ? "" : "s"} —{" "}
            <span className="font-semibold text-emerald-700">
              {exactCount} exact
            </span>
            ,{" "}
            <span className="font-semibold text-sky-700">
              {results.length - exactCount} prefix
            </span>
          </p>
          <ul className="mt-4 space-y-3">
            {results.map(({ entry, matchType }) => {
              const firstSynset = synsetById.get(entry.senses[0]?.synset);
              const def = firstSynset?.definition?.text;
              return (
                <li
                  key={entry.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
                    matchType === "exact"
                      ? "border-l-4 border-slate-200 border-l-emerald-600"
                      : "border-l-4 border-slate-200 border-l-sky-400"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <WordLink
                      href={`/word/${entry.id}`}
                      className="font-bengali text-xl font-bold text-slate-900 hover:text-emerald-700"
                    >
                      {entry.lemma}
                    </WordLink>
                    <PosBadge pos={entry.pos} />
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        matchType === "exact"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {matchType}
                    </span>
                    {showIds ? (
                      <>
                        <IdChip id={entry.id} />
                        {entry.senses[0] ? (
                          <IdChip id={entry.senses[0].synset} />
                        ) : null}
                      </>
                    ) : null}
                    <WordLink
                      href={`/word/${entry.id}`}
                      className="ml-auto shrink-0 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Show Details →
                    </WordLink>
                  </div>
                  {def ? (
                    <p className="font-bengali mt-1.5 text-sm text-slate-600">
                      {def.slice(0, 100)}
                      {def.length > 100 ? "…" : ""}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
