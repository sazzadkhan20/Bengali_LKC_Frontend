import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isKnownIli } from "@/lib/lexicon";
import { searchWn21Ili, wn21Stats, type WnPos } from "@/lib/wordnet21";

const POS: Array<WnPos | "any"> = ["any", "n", "v", "a", "r"];

/**
 * Princeton WordNet 2.1 ILI lookup (SRS §13.2).
 * Query: ?word=bank&pos=n  (pos optional; defaults to any)
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word")?.trim() ?? "";
  const posParam = (searchParams.get("pos")?.trim() ?? "any") as WnPos | "any";
  const pos = POS.includes(posParam) ? posParam : "any";

  if (word.length < 2) {
    return NextResponse.json({
      results: [],
      registry: wn21Stats(),
    });
  }

  const results = searchWn21Ili(word, pos, 25, isKnownIli);
  return NextResponse.json({
    results,
    registry: wn21Stats(),
  });
}
