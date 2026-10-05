import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchSynsetSearch, parsePage } from "@/lib/lexicon-api";
import { SynsetSearchView } from "@/components/public/SynsetSearchView";

export const metadata: Metadata = { title: "Synset Search" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

export default async function SynsetSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);
  const result = q ? await fetchSynsetSearch(q, page, PER_PAGE) : null;
  if (result && !result.ok && result.status === 401) redirect("/login");

  return (
    <SynsetSearchView
      q={q}
      result={result?.ok ? result.data : null}
      error={result && !result.ok ? result.error : null}
    />
  );
}
