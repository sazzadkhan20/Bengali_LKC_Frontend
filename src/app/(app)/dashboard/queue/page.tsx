import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { STATE_LABEL } from "@/lib/format";
import { PageTitle } from "@/components/ui";
import { SubmissionBrowser } from "@/components/dashboard/SubmissionBrowser";
import type { EntryState } from "@/lib/types";

export const metadata: Metadata = { title: "Queue Management" };

const ALL_STATES = Object.keys(STATE_LABEL) as EntryState[];

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; assigned?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const canManage = hasPermission(session.role, "bulk_operations");
  const isEditor = session.role === "LEXICAL_EDITOR";
  const isChief = session.role === "CHIEF_LEXICAL_EDITOR";
  if (!canManage && !isEditor && !isChief) redirect("/dashboard");

  const params = await searchParams;
  const initialQuery = typeof params.q === "string" ? params.q.slice(0, 100) : "";

  if (canManage) {
    const initialState = ALL_STATES.includes(params.state as EntryState)
      ? (params.state as EntryState)
      : undefined;
    return (
      <div className="mx-auto max-w-6xl">
        <PageTitle
          title="Queue Management"
          subtitle="View, filter, assign and override user-submitted entries in any validation state."
        />
        <SubmissionBrowser
          mode="manage"
          initialState={initialState}
          initialQuery={initialQuery}
          emptyMessage="No entries in this state."
        />
        <p className="mt-3 text-xs text-slate-400">
          Open an entry to review it, assign it, or override its state.
        </p>
      </div>
    );
  }

  const fixedState: EntryState = isEditor ? "PENDING_REVIEW" : "EDITOR_APPROVED";
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title={
          isEditor
            ? "Review Queue (PENDING_REVIEW)"
            : "Linguistic Review Queue (EDITOR_APPROVED)"
        }
        subtitle={
          isEditor
            ? "Entries awaiting primary structural validation. Open an entry to approve, flag or reject."
            : "Entries awaiting your definitive linguistic validation."
        }
      />
      <SubmissionBrowser
        mode="review"
        fixedState={fixedState}
        initialAssignedToMe={params.assigned === "me"}
        initialQuery={initialQuery}
        emptyMessage="The queue is empty."
      />
    </div>
  );
}
