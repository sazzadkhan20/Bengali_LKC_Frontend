import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { searchSynset } from "@/lib/lexicon";
import { SearchBox } from "@/components/public/SearchBox";
import { EmptyState, IdChip, LangBadge, PosBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Synset Search" };

export default async function SynsetSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login"); // authenticated only (SRS §9.2)

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const results = q ? searchSynset(q) : [];

  return (
    <div className="py-6">
      <SearchBox initialQuery={q} target="/search/synset" />
      <p className="mt-3 text-xs text-slate-400">
        Accepts a Synset ID (<code className="font-mono">ben-syn442834</code>),
        an ILI code (<code className="font-mono">01605630-n</code>), or a
        natural-language concept description (full-text over definitions).
      </p>

      {!q ? null : results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`No synsets match “${q}”`}
            message="Check the ID/ILI format, or describe the concept in plain Bengali or English."
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
                <Link
                  href={`/synset/${synset.id}`}
                  className="text-sm font-bold text-emerald-800 hover:underline"
                >
                  {synset.id}
                </Link>
                <PosBadge pos={synset.pos} />
                <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                  ILI {synset.ili}
                </span>
                <span className="text-[11px] text-slate-400">
                  lexicalized: {String(synset.lexicalized)}
                </span>
                <Link
                  href={`/synset/${synset.id}`}
                  className="ml-auto text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Open synset →
                </Link>
              </div>
              {synset.definition ? (
                <p className="font-bengali mt-2 text-sm text-slate-700">
                  <LangBadge lang={synset.definition.language} />{" "}
                  {synset.definition.text}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-semibold">
                  Bengali words ({entries.length}):
                </span>{" "}
                {entries.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 ? ", " : ""}
                    <Link
                      href={`/word/${e.id}`}
                      className="font-bengali text-sm font-semibold text-emerald-700 hover:underline"
                    >
                      {e.lemma}
                    </Link>
                  </span>
                ))}
              </p>
              {synset.relations && synset.relations.length > 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-semibold">Relations:</span>{" "}
                  {synset.relations.map((r, i) => (
                    <span key={`${r.target}-${i}`}>
                      {i > 0 ? " · " : ""}
                      {r.relType} →{" "}
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
      )}
    </div>
  );
}
