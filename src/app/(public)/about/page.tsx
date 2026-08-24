import type { Metadata } from "next";
import { AboutContent } from "@/components/public/AboutContent";
import { lexiconMeta, lexiconStats } from "@/lib/lexicon";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  const stats = lexiconStats();
  return (
    <AboutContent
      stats={{
        totalEntries: stats.totalEntries,
        totalSenses: stats.totalSenses,
        totalSynsets: stats.totalSynsets,
        polysemousEntries: stats.polysemousEntries,
      }}
      lexiconId={lexiconMeta.id}
      lexiconVersion={lexiconMeta.version}
      publisher={lexiconMeta.publisher}
    />
  );
}
