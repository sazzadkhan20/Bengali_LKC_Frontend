import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchSense } from "@/lib/lexicon-api";
import { REL_LABEL } from "@/lib/format";
import {
  SenseSearchView,
  type SenseHitView,
} from "@/components/public/SenseSearchView";

export const metadata: Metadata = { title: "Sense ID Search" };
export const dynamic = "force-dynamic";

export default async function SenseSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const result = q ? await fetchSense(q) : null;
  if (result && !result.ok && result.status === 401) redirect("/login");

  let hit: SenseHitView | null = null;
  if (result?.ok) {
    const s = result.data;
    hit = {
      entryId: s.entryId,
      lemma: s.lemma,
      pos: s.pos,
      senseId: s.senseId,
      synsetId: s.synsetId,
      ili: s.ili,
      synsetPos: s.synsetPos,
      defLang: s.defLang,
      defText: s.defText,
      crowdsourced: s.crowdsourced,
      validatedAt: s.validatedAt,
      relations: s.relations.map((rel) => ({
        relType: rel.relType,
        relLabel: REL_LABEL[rel.relType] ?? rel.relType,
        target: rel.target,
        targetLemma: rel.targetLemma,
      })),
    };
  }
  const error =
    result && !result.ok && result.status !== 404 && result.status !== 400
      ? result.error
      : null;

  return <SenseSearchView q={q} hit={hit} error={error} />;
}
