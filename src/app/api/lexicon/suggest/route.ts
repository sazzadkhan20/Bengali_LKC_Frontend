import { NextResponse, type NextRequest } from "next/server";
import { fetchSuggestions } from "@/lib/lexicon-api";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ q: "", items: [] });
  if (q.length > 80) {
    return NextResponse.json({ error: "Query is too long." }, { status: 400 });
  }
  const limit = Math.min(12, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 8));
  const result = await fetchSuggestions(q, limit);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status >= 500 ? 502 : result.status });
  }
  const items = result.data.items.map((i) => ({
    id: i.id,
    lemma: i.lemma,
    pos: i.pos,
    matchType: i.matchType,
    crowdsourced: i.crowdsourced,
    definition: i.definition,
  }));
  return NextResponse.json(
    { q: result.data.q, items },
    { headers: { "Cache-Control": "no-store" } }
  );
}
