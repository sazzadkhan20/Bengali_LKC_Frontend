import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchSynset } from "@/lib/lexicon-api";
import { SemanticGraph } from "@/components/SemanticGraph";
import {
  CrowdsourcedBadge,
  LexiconUnavailable,
  ValidatedNote,
} from "@/components/public/LexiconBits";
import { Card, CardHeader, IdChip, LangBadge, PosBadge } from "@/components/ui";
import { REL_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

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
  const result = await fetchSynset(id);
  if (!result.ok && (result.status === 404 || result.status === 400)) notFound();
  if (!result.ok && result.status === 401) redirect("/login");

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <LexiconUnavailable />
      </div>
    );
  }

  const synset = result.data;
  const { words, hypernymPath: path, incoming, graph: graphNodes } = synset;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link href="/search/synset" className="hover:text-emerald-700">
          Synset Search
        </Link>{" "}
        / <span className="font-mono text-slate-600">{synset.id}</span>
      </nav>

      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-all font-mono text-xl font-bold text-slate-900">
              {synset.id}
            </h1>
            <PosBadge pos={synset.pos} />
            <span className="rounded bg-violet-50 px-2 py-1 font-mono text-xs text-violet-700 ring-1 ring-inset ring-violet-200">
              ILI {synset.ili}
            </span>
            <span className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
              {synset.lexicalized ? "Lexicalized" : "Not lexicalized"}
            </span>
            {synset.crowdsourced ? (
              <>
                <CrowdsourcedBadge validatedAt={synset.validatedAt} size="md" />
                <ValidatedNote validatedAt={synset.validatedAt} />
              </>
            ) : null}
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
              Bengali words in this synset ({synset.wordCount})
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
                    className={`font-bengali rounded-xl px-3 py-1.5 text-base font-semibold ring-1 ring-inset transition ${
                      w.crowdsourced
                        ? "bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100"
                        : "bg-emerald-50 text-emerald-900 ring-emerald-200 hover:bg-emerald-100"
                    }`}
                    title={w.crowdsourced ? "Crowdsourced word" : undefined}
                  >
                    {w.lemma}
                  </Link>
                ))
              )}
              {synset.wordCount > words.length ? (
                <span className="self-center text-xs text-slate-400">
                  +{synset.wordCount - words.length} more
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {/* Hypernym path breadcrumb (SRS §9.2) */}
      {path.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Hypernym path"
            subtitle="Chain of is-a relations up to the root concept"
          />
          <div className="thin-scroll overflow-x-auto px-5 py-4">
            <ol className="flex min-w-max items-center gap-2 text-sm">
              <li className="rounded-lg bg-emerald-700 px-3 py-1.5 font-mono text-xs font-bold text-white">
                {synset.id}
              </li>
              {path.map((step) => (
                <li key={step.synsetId} className="flex items-center gap-2">
                  <span className="text-slate-300" aria-hidden>
                    →
                  </span>
                  <Link
                    href={`/synset/${step.synsetId}`}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 transition hover:bg-emerald-50"
                    title={step.definition ?? undefined}
                  >
                    <span className="font-bengali font-semibold text-slate-700">
                      {step.words[0]?.lemma ?? "—"}
                    </span>{" "}
                    <span className="font-mono text-[10px] text-slate-400">
                      {step.synsetId}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Outgoing relations" subtitle="This synset → target" />
          <ul className="divide-y divide-slate-100 px-5">
            {synset.relations.map((rel, i) => (
              <li key={`${rel.target}-${i}`} className="py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-slate-50 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-200">
                    {REL_LABEL[rel.relType] ?? rel.relType}
                  </span>
                  <Link href={`/synset/${rel.target}`}>
                    <IdChip id={rel.target} />
                  </Link>
                  {rel.words.map((w) => (
                    <Link
                      key={w.id}
                      href={`/word/${w.id}`}
                      className="font-bengali font-semibold text-emerald-700 hover:underline"
                    >
                      {w.lemma}
                    </Link>
                  ))}
                </div>
                {rel.definition ? (
                  <p className="mt-1 text-xs italic text-slate-400">{rel.definition}</p>
                ) : null}
              </li>
            ))}
            {synset.relations.length === 0 ? (
              <li className="py-4 text-sm italic text-slate-400">
                No outgoing relations.
              </li>
            ) : null}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Incoming relations" subtitle="Source → this synset" />
          <ul className="divide-y divide-slate-100 px-5">
            {incoming.map((rel, i) => (
              <li key={`${rel.source}-${i}`} className="py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-slate-50 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-200">
                    {REL_LABEL[rel.relType] ?? rel.relType}
                  </span>
                  <Link href={`/synset/${rel.source}`}>
                    <IdChip id={rel.source} />
                  </Link>
                  {rel.words.map((w) => (
                    <Link
                      key={w.id}
                      href={`/word/${w.id}`}
                      className="font-bengali font-semibold text-emerald-700 hover:underline"
                    >
                      {w.lemma}
                    </Link>
                  ))}
                </div>
                {rel.definition ? (
                  <p className="mt-1 text-xs italic text-slate-400">{rel.definition}</p>
                ) : null}
              </li>
            ))}
            {incoming.length === 0 ? (
              <li className="py-4 text-sm italic text-slate-400">
                No incoming relations.
              </li>
            ) : null}
            {synset.incomingTotal > incoming.length ? (
              <li className="py-3 text-xs text-slate-400">
                +{synset.incomingTotal - incoming.length} more incoming relations
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

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
