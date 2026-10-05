import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getSession } from "@/lib/auth";
import { fetchWord } from "@/lib/lexicon-api";
import { WordLink } from "@/components/WordLink";
import { WordEntryDetail } from "@/components/EntryCard";
import { SemanticGraph } from "@/components/SemanticGraph";
import { LexiconUnavailable } from "@/components/public/LexiconBits";
import { Card, CardHeader, IdChip } from "@/components/ui";

export const dynamic = "force-dynamic";

const loadWord = cache((id: string) => fetchWord(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const word = await loadWord(id);
  if (word.ok) return { title: `${word.data.lemma} — Word` };
  return { title: word.status === 404 ? "Word not found" : "Word" };
}

export default async function WordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await loadWord(id);
  if (!result.ok && (result.status === 404 || result.status === 400)) notFound();

  const session = await getSession();
  const showIds = session !== null;

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <LexiconUnavailable />
      </div>
    );
  }

  const word = result.data;
  const path = word.hypernymPath;
  const graphNodes = word.graph;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link href="/dictionary" className="hover:text-emerald-700">
          Dictionary
        </Link>{" "}
        / <span className="font-bengali text-slate-600">{word.lemma}</span>
      </nav>

      <WordEntryDetail word={word} showIds={showIds} />

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
                {word.lemma}
              </li>
              {path.map((step) => {
                const first = step.words[0];
                const chip =
                  "font-bengali rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800";
                return (
                  <li key={step.synsetId} className="flex items-center gap-2">
                    <span className="text-slate-300" aria-hidden>
                      →
                    </span>
                    {showIds ? (
                      <Link
                        href={`/synset/${step.synsetId}`}
                        className={chip}
                        title={step.definition ?? undefined}
                      >
                        {first?.lemma ?? step.synsetId}
                      </Link>
                    ) : first ? (
                      <WordLink
                        href={`/word/${first.id}`}
                        className={chip}
                        title={step.definition ?? undefined}
                      >
                        {first.lemma}
                      </WordLink>
                    ) : (
                      <span
                        className="rounded-lg bg-slate-100 px-3 py-1.5 italic text-slate-400"
                        title={step.definition ?? undefined}
                      >
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
              showIds && word.primarySynsetId ? (
                <span>
                  Immediate relations of <IdChip id={word.primarySynsetId} /> —
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
                const first = node.words[0];
                return first ? `/word/${first.id}` : null;
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
            This entry has no hypernym chain or semantic neighbours yet. The
            senses and definitions above are the full record for this word.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
