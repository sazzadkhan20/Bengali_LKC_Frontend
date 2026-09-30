import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  entriesBySynset,
  hypernymPath,
  reverseSynsetRelations,
  semanticNeighbourhood,
  synsetById,
} from "@/lib/lexicon";
import { SemanticGraph } from "@/components/SemanticGraph";
import { Card, CardHeader, IdChip, LangBadge, PosBadge } from "@/components/ui";
import { REL_LABEL } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `${id} — Synset` };
}

export default async function SynsetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login"); // synset navigation is an authenticated feature

  const { id } = await params;
  const synset = synsetById.get(id);
  if (!synset) notFound();

  const words = entriesBySynset.get(id) ?? [];
  const graphNodes = semanticNeighbourhood(id);
  const path = hypernymPath(id);
  const incoming = reverseSynsetRelations.get(id) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-xs text-slate-400">
        <Link href="/search/synset" className="hover:text-emerald-700">
          Synset Search
        </Link>{" "}
        / <span className="font-mono text-slate-600">{id}</span>
      </nav>

      <Card>
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-bold text-slate-900">
              {synset.id}
            </h1>
            <PosBadge pos={synset.pos} />
            <span className="rounded bg-violet-50 px-2 py-1 font-mono text-xs text-violet-700 ring-1 ring-inset ring-violet-200">
              ILI {synset.ili}
            </span>
            <span className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
              lexicalized: {String(synset.lexicalized)}
            </span>
          </div>

          {synset.definition ? (
            <p className="font-bengali mt-4 text-lg leading-relaxed text-slate-800">
              <LangBadge lang={synset.definition.language} />{" "}
              {synset.definition.text}
            </p>
          ) : (
            <p className="mt-4 text-sm italic text-slate-400">
              No definition recorded yet — contributors can add one via Quick
              Input.
            </p>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Bengali words in this synset ({words.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {words.length === 0 ? (
                <span className="text-sm italic text-slate-400">
                  Lexical gap — no Bengali word lexicalises this concept yet.
                </span>
              ) : (
                words.map((w) => (
                  <Link
                    key={w.id}
                    href={`/word/${w.id}`}
                    className="font-bengali rounded-xl bg-emerald-50 px-3 py-1.5 text-base font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100"
                  >
                    {w.lemma}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Hypernym path breadcrumb (SRS §9.2) */}
      {path.length > 0 ? (
        <Card className="mt-6">
          <CardHeader title="Hypernym path" subtitle="Chain of is-a relations up to the root concept" />
          <div className="thin-scroll overflow-x-auto px-5 py-4">
            <ol className="flex min-w-max items-center gap-2 text-sm">
              <li className="rounded-lg bg-emerald-700 px-3 py-1.5 font-mono text-xs font-bold text-white">
                {synset.id}
              </li>
              {path.map((syn) => {
                const w = entriesBySynset.get(syn.id) ?? [];
                return (
                  <li key={syn.id} className="flex items-center gap-2">
                    <span className="text-slate-300">→</span>
                    <Link
                      href={`/synset/${syn.id}`}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 transition hover:bg-emerald-50"
                      title={syn.definition?.text}
                    >
                      <span className="font-bengali font-semibold text-slate-700">
                        {w[0]?.lemma ?? "—"}
                      </span>{" "}
                      <span className="font-mono text-[10px] text-slate-400">
                        {syn.id}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Outgoing relations */}
        <Card>
          <CardHeader title="Outgoing relations" subtitle="This synset → target" />
          <ul className="divide-y divide-slate-100 px-5">
            {(synset.relations ?? []).map((rel, i) => {
              const targetWords = entriesBySynset.get(rel.target) ?? [];
              const target = synsetById.get(rel.target);
              return (
                <li key={`${rel.target}-${i}`} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded bg-slate-50 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-200">
                      {REL_LABEL[rel.relType] ?? rel.relType}
                    </span>
                    <Link href={`/synset/${rel.target}`}>
                      <IdChip id={rel.target} />
                    </Link>
                    {targetWords.slice(0, 3).map((w) => (
                      <Link
                        key={w.id}
                        href={`/word/${w.id}`}
                        className="font-bengali font-semibold text-emerald-700 hover:underline"
                      >
                        {w.lemma}
                      </Link>
                    ))}
                  </div>
                  {target?.definition ? (
                    <p className="mt-1 text-xs italic text-slate-400">
                      {target.definition.text.slice(0, 110)}
                      {target.definition.text.length > 110 ? "…" : ""}
                    </p>
                  ) : null}
                </li>
              );
            })}
            {(synset.relations ?? []).length === 0 ? (
              <li className="py-4 text-sm italic text-slate-400">
                No outgoing relations.
              </li>
            ) : null}
          </ul>
        </Card>

        {/* Incoming relations */}
        <Card>
          <CardHeader title="Incoming relations" subtitle="Source → this synset" />
          <ul className="divide-y divide-slate-100 px-5">
            {incoming.slice(0, 20).map((rel, i) => {
              const sourceWords = entriesBySynset.get(rel.source) ?? [];
              return (
                <li key={`${rel.source}-${i}`} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded bg-slate-50 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-200">
                      {REL_LABEL[rel.relType] ?? rel.relType}
                    </span>
                    <Link href={`/synset/${rel.source}`}>
                      <IdChip id={rel.source} />
                    </Link>
                    {sourceWords.slice(0, 3).map((w) => (
                      <Link
                        key={w.id}
                        href={`/word/${w.id}`}
                        className="font-bengali font-semibold text-emerald-700 hover:underline"
                      >
                        {w.lemma}
                      </Link>
                    ))}
                  </div>
                </li>
              );
            })}
            {incoming.length === 0 ? (
              <li className="py-4 text-sm italic text-slate-400">
                No incoming relations.
              </li>
            ) : null}
            {incoming.length > 20 ? (
              <li className="py-3 text-xs text-slate-400">
                +{incoming.length - 20} more incoming relations
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      {/* Graph */}
      {graphNodes.length > 1 ? (
        <Card className="mt-6">
          <CardHeader
            title="Semantic graph"
            subtitle="Immediate neighbourhood — click a node to navigate"
          />
          <div className="px-5 py-4">
            <SemanticGraph
              nodes={graphNodes}
              showIds
              hrefFor={(node) =>
                node.direction === "self" ? null : `/synset/${node.synsetId}`
              }
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
