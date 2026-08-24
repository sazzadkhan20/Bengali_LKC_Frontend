import { HomeHero } from "@/components/public/HomeHero";
import { HomeBody } from "@/components/public/HomeBody";
import { lexiconStats } from "@/lib/lexicon";

export default function HomePage() {
  const stats = lexiconStats();
  const counters = [
    { key: "entries", value: stats.totalEntries },
    { key: "senses", value: stats.totalSenses },
    { key: "synsets", value: stats.totalSynsets },
    {
      key: "relations",
      value:
        Object.values(stats.synsetRelationCounts).reduce((a, b) => a + b, 0) +
        Object.values(stats.senseRelationCounts).reduce((a, b) => a + b, 0),
    },
  ];

  return (
    <>
      <HomeHero />
      <HomeBody counters={counters} />
    </>
  );
}
