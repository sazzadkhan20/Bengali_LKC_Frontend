import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { Card, PageTitle } from "@/components/ui";
import { QuickInputForm } from "@/components/dashboard/QuickInputForm";

export const metadata: Metadata = { title: "Quick Input" };

export default async function QuickInputPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "quick_input")) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Quick Input — New Lexical Entry"
        subtitle="Enter a complete lexical record (word + POS + synset linkage + definition + relations) in a single submission. Bengali Unicode is supported natively. Lookups run against the full UKC lexicon."
      />
      {session.role === "PLATFORM_ARCHITECT" ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Platform Architect may use Quick Input for emergency corrections.
          Direct validation (bypass) is available when justified.
        </div>
      ) : null}
      {session.role === "CONTRIBUTOR" ? (
        <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
          Daily entry limits and minimum form time apply. Submissions that are
          too fast may be held under review by a System Moderator.
        </div>
      ) : null}
      <Card className="p-6">
        <QuickInputForm role={session.role} />
      </Card>
    </div>
  );
}
