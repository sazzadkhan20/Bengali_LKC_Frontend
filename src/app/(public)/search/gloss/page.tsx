import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { searchByGloss } from "@/lib/lexicon";
import { SearchBox } from "@/components/public/SearchBox";
import { EmptyState, IdChip, LangBadge, PosBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Gloss Search" };

export default async function GlossSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const showIds = session !== null;
  const q = params.q?.trim() ?? "";
  const results = q ? searchByGloss(q) : [];

  return (
    <div className="py-6">
      <SearchBox initialQuery={q} target="/search/gloss" />
      <p className="mt-3 text-xs text-slate-400">
        Searches definition texts in Bengali and English (exact substring
        match). Example: <em>পাখি</em> or <em>bird</em>.
      </p>

      {!q ? null : results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`No definitions contain “${q}”`}
            message="Gloss search currently uses exact matching; LLM-assisted semantic matching is a planned enhancement."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {results.map(({ synset, entries }) => (
            <li
              key={synset.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <PosBadge pos={synset.pos} />
                {showIds ? (
                  <>
                    <Link href={`/synset/${synset.id}`}>
                      <IdChip id={synset.id} />
                    </Link>
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                      ILI {synset.ili}
                    </span>
                  </>
                ) : null}
              </div>
              {synset.definition ? (
                <p className="font-bengali mt-2 text-sm leading-relaxed text-slate-700">
                  <LangBadge lang={synset.definition.language} />{" "}
                  {synset.definition.text}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-semibold">Words:</span>{" "}
                {entries.length === 0 ? (
                  <span className="italic">lexical gap — no Bengali word yet</span>
                ) : (
                  entries.map((e, i) => (
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
