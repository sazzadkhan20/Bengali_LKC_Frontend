import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { senseById, synsetById } from "@/lib/lexicon";
import { SearchBox } from "@/components/public/SearchBox";
import { EmptyState, IdChip, LangBadge, PosBadge } from "@/components/ui";
import { REL_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Sense ID Search" };

export default async function SenseSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login"); // authenticated only (SRS §9.3)

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const hit = q ? senseById.get(q) : undefined;
  const synset = hit ? synsetById.get(hit.sense.synset) : undefined;

  return (
    <div className="py-6">
      <SearchBox initialQuery={q} target="/search/sense" />
      <p className="mt-3 text-xs text-slate-400">
        Accepts a Sense ID, e.g.{" "}
        <code className="font-mono">ben-sen691008</code>.
      </p>

      {!q ? null : !hit ? (
        <div className="mt-8">
          <EmptyState
            title={`No sense found for “${q}”`}
            message="Sense IDs follow the pattern ben-sen{integer}."
          />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/word/${hit.entry.id}`}
              className="font-bengali text-2xl font-bold text-slate-900 hover:text-emerald-700"
            >
              {hit.entry.lemma}
            </Link>
            <PosBadge pos={hit.entry.pos} />
            <IdChip id={hit.sense.id} />
            <span className="text-xs text-slate-400">belongs to</span>
            <Link href={`/synset/${hit.sense.synset}`}>
              <IdChip id={hit.sense.synset} />
            </Link>
          </div>

          {synset ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Parent synset
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-violet-700 ring-1 ring-inset ring-violet-200">
                  ILI {synset.ili}
                </span>
                <PosBadge pos={synset.pos} />
              </div>
              {synset.definition ? (
                <p className="font-bengali mt-2 text-sm text-slate-700">
                  <LangBadge lang={synset.definition.language} />{" "}
                  {synset.definition.text}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Sense relations
            </p>
            {hit.sense.relations && hit.sense.relations.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {hit.sense.relations.map((rel, i) => {
                  const target = senseById.get(rel.target);
                  return (
                    <li
                      key={`${rel.target}-${i}`}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="rounded bg-white px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-200">
                        {REL_LABEL[rel.relType] ?? rel.relType}
                      </span>
                      {target ? (
                        <Link
                          href={`/search/sense?q=${rel.target}`}
                          className="font-bengali font-semibold text-emerald-700 hover:underline"
                        >
                          {target.entry.lemma}
                        </Link>
                      ) : null}
                      <Link href={`/search/sense?q=${rel.target}`}>
                        <IdChip id={rel.target} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1.5 text-sm italic text-slate-400">
                This sense has no recorded sense-level relations.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
