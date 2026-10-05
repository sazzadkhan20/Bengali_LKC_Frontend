import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { fetchGlossSearch, parsePage, parsePosFilter } from "@/lib/lexicon-api";
import { GlossSearchView } from "@/components/public/GlossSearchView";

export const metadata: Metadata = { title: "Gloss Search" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

export default async function GlossSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pos?: string; page?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const q = params.q?.trim() ?? "";
  const posFilter = parsePosFilter(params.pos);
  const page = parsePage(params.page);
  const result = q ? await fetchGlossSearch(q, posFilter, page, PER_PAGE) : null;

  return (
    <GlossSearchView
      q={q}
      posFilter={posFilter}
      showIds={session !== null}
      result={result?.ok ? result.data : null}
      error={result && !result.ok ? result.error : null}
    />
  );
}
