import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { PageTitle, Card } from "@/components/ui";
import { IliFinderPanel } from "@/components/dashboard/IliFinderPanel";

export const metadata: Metadata = { title: "ILI Finder" };

export default async function IliFinderPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canCreate = hasPermission(session.role, "quick_input");

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="ILI Finder"
        subtitle="Look up Princeton WordNet 3.0 Inter-Lingual Index codes by English word and part of speech. Use a code when creating a new synset in Quick Input."
      />

      <Card className="p-6">
        <IliFinderPanel canCreate={canCreate} />
      </Card>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Source: official Princeton WordNet 3.0 database. ILI codes are WordNet 3.0 synset offsets
        ({"{8-digit-offset}-{n|v|a|r}"}), the same version as the UKC seed data. A concept marked
        “already present” is in the Bengali LKC — link to its synset instead of creating a new one.
        {canCreate
          ? " “Use this code” opens Quick Input with the code filled in."
          : " “Use this code” copies the code to your clipboard."}
      </p>
    </div>
  );
}
