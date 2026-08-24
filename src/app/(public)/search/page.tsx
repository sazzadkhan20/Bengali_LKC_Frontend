import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { searchByWord, synsetById } from "@/lib/lexicon";
import {
  WordSearchView,
  type WordSearchHit,
} from "@/components/public/WordSearchView";
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

  const raw = q
    ? searchByWord(q, { pos: posFilter.length ? posFilter : undefined })
    : [];
  const exactCount = raw.filter((r) => r.matchType === "exact").length;

  const results: WordSearchHit[] = raw.map(({ entry, matchType }) => {
    const firstSynset = synsetById.get(entry.senses[0]?.synset);
    const def = firstSynset?.definition?.text;
    return {
      id: entry.id,
      lemma: entry.lemma,
      pos: entry.pos,
      matchType,
      defPreview: def
        ? `${def.slice(0, 100)}${def.length > 100 ? "…" : ""}`
        : null,
      synsetId: entry.senses[0]?.synset ?? null,
    };
  });

  return (
    <WordSearchView
      q={q}
      posFilter={posFilter}
      showIds={showIds}
      exactCount={exactCount}
      results={results}
    />
  );
}
