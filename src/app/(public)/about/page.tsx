import type { Metadata } from "next";
import { AboutContent } from "@/components/public/AboutContent";
import { fetchLexiconStats } from "@/lib/lexicon-api";

export const metadata: Metadata = { title: "About" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const result = await fetchLexiconStats();
  const s = result.ok ? result.data : null;
  return (
    <AboutContent
      stats={
        s
          ? {
              totalEntries: s.entries,
              totalSenses: s.senses,
              totalSynsets: s.synsets,
              polysemousEntries: s.polysemousEntries,
              crowdsourcedEntries: s.crowdsourcedEntries,
            }
          : null
      }
      lexiconId={s?.lexicon?.id ?? null}
      lexiconVersion={s?.lexicon?.version ?? null}
      publisher={s?.lexicon?.publisher ?? null}
    />
  );
}
