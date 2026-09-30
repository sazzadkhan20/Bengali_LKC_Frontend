import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { STATE_LABEL } from "@/lib/format";
import { PageTitle } from "@/components/ui";
import { ReviewHistoryBrowser } from "@/components/dashboard/ReviewHistoryBrowser";
import type { EntryState, Role } from "@/lib/types";

export const metadata: Metadata = { title: "Review History" };

/** Mirrors SubmissionBrowseService.HISTORY_EXCLUDED; the API enforces it. */
const EXCLUDED: Partial<Record<Role, EntryState[]>> = {
  LEXICAL_EDITOR: ["DRAFT", "PENDING_REVIEW"],
  CHIEF_LEXICAL_EDITOR: ["DRAFT", "PENDING_REVIEW", "EDITOR_APPROVED", "FLAGGED"],
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const excluded = EXCLUDED[session.role];
  if (!excluded) redirect("/dashboard");

  const states = (Object.keys(STATE_LABEL) as EntryState[]).filter((s) => !excluded.includes(s));
  const params = await searchParams;
  const initialState = states.includes(params.state as EntryState)
    ? (params.state as EntryState)
    : undefined;
  const initialQuery = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const isEditor = session.role === "LEXICAL_EDITOR";

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title={isEditor ? "My Review History" : "My Validation History"}
        subtitle={
          isEditor
            ? "Entries you approved, flagged, rejected or disputed, with their current status. Newest decision first."
            : "Entries you validated, C-flagged or disputed, with their current status. Newest decision first."
        }
      />
      <ReviewHistoryBrowser states={states} initialState={initialState} initialQuery={initialQuery} />
      <p className="mt-3 text-xs text-slate-400">
        Click any row to open the entry. Entries that are back in your review queue appear there instead.
      </p>
    </div>
  );
}
