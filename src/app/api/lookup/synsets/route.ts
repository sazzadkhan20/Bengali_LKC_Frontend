import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { allSynsets, entriesBySynset, synsetById } from "@/lib/lexicon";

/** Synset autocomplete for the Quick Input form (SRS §6.2). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const results: {
    id: string;
    ili: string;
    pos: string;
    definition?: string;
    words: string[];
  }[] = [];

  const push = (id: string) => {
    const syn = synsetById.get(id);
    if (!syn || results.some((r) => r.id === id)) return;
    results.push({
      id: syn.id,
      ili: syn.ili,
      pos: syn.pos,
      definition: syn.definition?.text?.slice(0, 110),
      words: (entriesBySynset.get(syn.id) ?? []).slice(0, 5).map((e) => e.lemma),
    });
  };

  if (/^ben-syn\d*$/i.test(q)) {
    for (const syn of allSynsets) {
      if (syn.id.startsWith(q.toLowerCase())) push(syn.id);
      if (results.length >= 10) break;
    }
  } else {
    // match by member word or definition substring
    const lower = q.toLowerCase();
    for (const syn of allSynsets) {
      const words = entriesBySynset.get(syn.id) ?? [];
      if (
        words.some((w) => w.lemma.startsWith(q)) ||
        syn.definition?.text?.toLowerCase().includes(lower)
      ) {
        push(syn.id);
      }
      if (results.length >= 10) break;
    }
  }
  return NextResponse.json({ results });
}
