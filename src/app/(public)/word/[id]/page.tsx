import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  entryById,
  hypernymPath,
  semanticNeighbourhood,
  entriesBySynset,
} from "@/lib/lexicon";
import { WordLink } from "@/components/WordLink";
import { EntryCard } from "@/components/EntryCard";
import { SemanticGraph } from "@/components/SemanticGraph";
import { Card, CardHeader, IdChip } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = entryById.get(id);
  return { title: entry ? `${entry.lemma} — Word` : "Word not found" };
}

export default async function WordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = entryById.get(id);
  if (!entry) notFound();

  const session = await getSession();
  const showIds = session !== null;
  const primarySynsetId = entry.senses[0]?.synset;
  const graphNodes = primarySynsetId
    ? semanticNeighbourhood(primarySynsetId)
    : [];
  const path = primarySynsetId ? hypernymPath(primarySynsetId) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-xs text-slate-400">
        <Link href="/dictionary" className="hover:text-emerald-700">
          Dictionary
        </Link>{" "}
        / <span className="font-bengali text-slate-600">{entry.lemma}</span>
      </nav>

      <EntryCard entry={entry} showIds={showIds} detailPage />

      {/* Hypernym breadcrumb to the root concept (SRS §9.2) */}
      {path.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Concept hierarchy"
            subtitle="Hypernym chain from this word's primary concept up to its root"
          />
          <div className="thin-scroll overflow-x-auto px-5 py-4">
            <ol className="flex min-w-max items-center gap-2 text-sm">
              <li className="font-bengali rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white">
                {entry.lemma}
              </li>
              {path.map((syn) => {
                const words = entriesBySynset.get(syn.id) ?? [];
                return (
                  <li key={syn.id} className="flex items-center gap-2">
                    <span className="text-slate-300">→</span>
                    {showIds ? (
                      <Link
                        href={`/synset/${syn.id}`}
                        className="font-bengali rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                        title={syn.definition?.text}
                      >
                        {words[0]?.lemma ?? syn.id}
                      </Link>
                    ) : words[0] ? (
                      <WordLink
                        href={`/word/${words[0].id}`}
                        className="font-bengali rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                        title={syn.definition?.text}
                      >
                        {words[0].lemma}
                      </WordLink>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 italic text-slate-400">
                        concept
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>
      ) : null}

      {/* Mini semantic graph (SRS §7.7.2 / §8.1.2) */}
      {graphNodes.length > 1 ? (
        <Card className="mt-6">
          <CardHeader
            title="Semantic neighbourhood"
            subtitle={
              showIds ? (
                <span>
                  Immediate relations of <IdChip id={primarySynsetId!} /> —
                  click a node to navigate
                </span>
              ) : (
                "Related concepts of this word — click a node to navigate"
              )
            }
          />
          <div className="px-5 py-4">
            <SemanticGraph
              nodes={graphNodes}
              showIds={showIds}
              hrefFor={(node) => {
                if (node.direction === "self") return null;
                if (showIds) return `/synset/${node.synsetId}`;
                // Visitors navigate word-to-word, never by synset ID
                const firstWordEntry = entriesBySynset.get(node.synsetId)?.[0];
                return firstWordEntry ? `/word/${firstWordEntry.id}` : null;
              }}
            />
          </div>
        </Card>
      ) : null}

      {path.length === 0 && graphNodes.length <= 1 ? (
        <Card className="mt-6">
          <CardHeader
            title="Lexical relations"
            subtitle="Concept hierarchy and semantic graph for this entry"
          />
          <p className="px-5 py-4 text-sm leading-relaxed text-slate-500">
            This entry has no hypernym chain or semantic neighbours in the
            current lexicon snapshot. The sense and definition above are the
            full record for this word.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
