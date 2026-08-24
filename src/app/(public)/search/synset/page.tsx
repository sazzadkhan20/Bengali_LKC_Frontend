import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { searchSynset } from "@/lib/lexicon";
import {
  SynsetSearchView,
  type SynsetHit,
} from "@/components/public/SynsetSearchView";

export const metadata: Metadata = { title: "Synset Search" };

export default async function SynsetSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const raw = q ? searchSynset(q) : [];

  const results: SynsetHit[] = raw.map(({ synset, entries }) => ({
    synsetId: synset.id,
    pos: synset.pos,
    ili: synset.ili,
    lexicalized: synset.lexicalized,
    defLang: synset.definition?.language ?? null,
    defText: synset.definition?.text ?? null,
    entries: entries.map((e) => ({ id: e.id, lemma: e.lemma })),
    relations: (synset.relations ?? []).map((r) => ({
      relType: r.relType,
      target: r.target,
    })),
  }));

  return <SynsetSearchView q={q} results={results} />;
}
