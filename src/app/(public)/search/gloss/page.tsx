import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { searchByGloss } from "@/lib/lexicon";
import {
  GlossSearchView,
  type GlossHit,
} from "@/components/public/GlossSearchView";

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
  const raw = q ? searchByGloss(q) : [];

  const results: GlossHit[] = raw.map(({ synset, entries }) => ({
    synsetId: synset.id,
    pos: synset.pos,
    ili: synset.ili,
    defLang: synset.definition?.language ?? null,
    defText: synset.definition?.text ?? null,
    entries: entries.map((e) => ({ id: e.id, lemma: e.lemma })),
  }));

  return <GlossSearchView q={q} showIds={showIds} results={results} />;
}
