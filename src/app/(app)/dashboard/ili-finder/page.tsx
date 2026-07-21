import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageTitle, Card } from "@/components/ui";
import { IliFinder } from "@/components/dashboard/IliFinder";
import { wn21Stats } from "@/lib/wordnet21";

export const metadata: Metadata = { title: "ILI Finder" };

export default async function IliFinderPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const registry = wn21Stats();

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="ILI Finder"
        subtitle={`Look up Princeton WordNet ${registry.version} Inter-Lingual Index codes by English word and part of speech. Use this when creating a new synset in Quick Input (SRS §13.2).`}
      />

      <Card className="p-6">
        <IliFinder />
      </Card>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Source: official Princeton WordNet {registry.version} package (
        {registry.synsetCount.toLocaleString()} synsets). Codes are stable
        WordNet 2.1 offsets — do not use WordNet 3.0/3.1 offsets; they differ.
        When a sense is already present in the Bengali LKC, link to the
        existing synset instead of creating a new one.
      </p>
    </div>
  );
}
