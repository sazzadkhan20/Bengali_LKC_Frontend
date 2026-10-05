import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { fetchWordSearch, parsePage, parsePosFilter } from "@/lib/lexicon-api";
import { WordSearchView } from "@/components/public/WordSearchView";

export const metadata: Metadata = { title: "Word Search" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;

export default async function WordSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pos?: string; page?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const q = params.q?.trim() ?? "";
  const posFilter = parsePosFilter(params.pos);
  const page = parsePage(params.page);

  const result = q ? await fetchWordSearch(q, posFilter, page, PER_PAGE) : null;

  return (
    <WordSearchView
      q={q}
      posFilter={posFilter}
      showIds={session !== null}
      result={result?.ok ? result.data : null}
      error={result && !result.ok ? result.error : null}
    />
  );
}
