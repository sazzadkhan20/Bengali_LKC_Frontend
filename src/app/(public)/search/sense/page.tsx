import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { senseById, synsetById } from "@/lib/lexicon";
import { REL_LABEL } from "@/lib/format";
import {
  SenseSearchView,
  type SenseHitView,
} from "@/components/public/SenseSearchView";

export const metadata: Metadata = { title: "Sense ID Search" };

export default async function SenseSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const found = q ? senseById.get(q) : undefined;
  const synset = found ? synsetById.get(found.sense.synset) : undefined;

  let hit: SenseHitView | null = null;
  if (found) {
    hit = {
      entryId: found.entry.id,
      lemma: found.entry.lemma,
      pos: found.entry.pos,
      senseId: found.sense.id,
      synsetId: found.sense.synset,
      ili: synset?.ili ?? null,
      synsetPos: synset?.pos ?? null,
      defLang: synset?.definition?.language ?? null,
      defText: synset?.definition?.text ?? null,
      relations: (found.sense.relations ?? []).map((rel) => {
        const target = senseById.get(rel.target);
        return {
          relType: rel.relType,
          relLabel: REL_LABEL[rel.relType] ?? rel.relType,
          target: rel.target,
          targetLemma: target?.entry.lemma ?? null,
        };
      }),
    };
  }

  return <SenseSearchView q={q} hit={hit} />;
}
