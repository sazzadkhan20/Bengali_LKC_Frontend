import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store } from "@/lib/store";
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
        subtitle="Enter a complete lexical record (word + POS + synset linkage + definition + relations) in a single submission. Bengali Unicode is supported natively."
      />
      {session.role === "PLATFORM_ARCHITECT" ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ Routine Quick Input use by the Platform Architect requires Lexical
          Committee permission (SRS §3.3). This form remains always available
          for emergency corrections.
        </div>
      ) : null}
      {session.role === "CONTRIBUTOR" ? (
        <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
          Session limit: {store.config.maxEntriesPerSession} entries · Daily
          limit: {store.config.maxEntriesPerDay} entries · Submissions faster
          than {store.config.minSubmissionSeconds}s are held for moderator
          review.
        </div>
      ) : null}
      <Card className="p-6">
        <QuickInputForm role={session.role} />
      </Card>
    </div>
  );
}
