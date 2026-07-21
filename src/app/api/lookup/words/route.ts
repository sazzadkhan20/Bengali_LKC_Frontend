import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sortedEntries, synsetById } from "@/lib/lexicon";

/** Word/sense autocomplete for relation targets in Quick Input (SRS §6.2). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  const results: {
    senseId: string;
    synsetId: string;
    lemma: string;
    pos: string;
    definition?: string;
  }[] = [];
  for (const e of sortedEntries) {
    if (!e.lemma.startsWith(q)) continue;
    for (const s of e.senses) {
      results.push({
        senseId: s.id,
        synsetId: s.synset,
        lemma: e.lemma,
        pos: e.pos,
        definition: synsetById.get(s.synset)?.definition?.text?.slice(0, 90),
      });
      if (results.length >= 10) break;
    }
    if (results.length >= 10) break;
  }
  return NextResponse.json({ results });
}
