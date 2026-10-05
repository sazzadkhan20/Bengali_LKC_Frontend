import { HomeHero } from "@/components/public/HomeHero";
import { HomeBody } from "@/components/public/HomeBody";
import { fetchLexiconStats } from "@/lib/lexicon-api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await fetchLexiconStats();
  const s = stats.ok ? stats.data : null;
  const counters = [
    { key: "entries", value: s?.entries ?? null },
    { key: "senses", value: s?.senses ?? null },
    { key: "synsets", value: s?.synsets ?? null },
    { key: "relations", value: s?.relations ?? null },
  ];

  return (
    <>
      <HomeHero />
      <HomeBody counters={counters} />
    </>
  );
}
