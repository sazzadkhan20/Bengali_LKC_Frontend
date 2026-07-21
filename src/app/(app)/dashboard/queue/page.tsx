import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { submissionsFor } from "@/lib/queries";
import { STATE_LABEL } from "@/lib/format";
import { Card, PageTitle } from "@/components/ui";
import { SubmissionTable } from "@/components/dashboard/SubmissionTable";
import type { EntryState } from "@/lib/types";

export const metadata: Metadata = { title: "Queue Management" };

const ALL_STATES = Object.keys(STATE_LABEL) as EntryState[];

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; assigned?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const canManage = hasPermission(session.role, "bulk_operations");
  const isEditor = session.role === "LEXICAL_EDITOR";
  const isChief = session.role === "CHIEF_LEXICAL_EDITOR";
  if (!canManage && !isEditor && !isChief) redirect("/dashboard");

  const params = await searchParams;
  // Editors are locked to their queue; managers can filter any state
  const defaultState: EntryState | undefined = isEditor
    ? "PENDING_REVIEW"
    : isChief
      ? "EDITOR_APPROVED"
      : undefined;
  const stateFilter = canManage
    ? ALL_STATES.includes(params.state as EntryState)
      ? (params.state as EntryState)
      : undefined
    : defaultState;
  const assignedToMe = params.assigned === "me";

  const items = submissionsFor(
    (s) =>
      (!stateFilter || s.state === stateFilter) &&
      (!assignedToMe || s.assignedTo === session.userId) &&
      // Editors see C_FLAGGED returns context via dashboard; queue is their primary state
      (canManage || s.state === defaultState)
  );

  const title = isEditor
    ? "Review Queue (PENDING_REVIEW)"
    : isChief
      ? "Linguistic Review Queue (EDITOR_APPROVED)"
      : "Queue Management";

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title={title}
        subtitle={
          canManage
            ? "View, filter, assign and override entries in any validation state."
            : isEditor
              ? "Entries awaiting primary structural validation. Open an entry to approve, flag or reject."
              : "Entries awaiting your definitive linguistic validation."
        }
      />

      {canManage ? (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <Link
            href="/dashboard/queue"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              !stateFilter
                ? "bg-slate-800 text-white ring-slate-800"
                : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
            }`}
          >
            All states
          </Link>
          {ALL_STATES.map((s) => (
            <Link
              key={s}
              href={`/dashboard/queue?state=${s}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                stateFilter === s
                  ? "bg-slate-800 text-white ring-slate-800"
                  : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              {STATE_LABEL[s]}
            </Link>
          ))}
        </div>
      ) : (
        <div className="mb-5 flex gap-1.5">
          <Link
            href="/dashboard/queue"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              !assignedToMe
                ? "bg-slate-800 text-white ring-slate-800"
                : "bg-white text-slate-600 ring-slate-300"
            }`}
          >
            Full queue
          </Link>
          <Link
            href="/dashboard/queue?assigned=me"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              assignedToMe
                ? "bg-slate-800 text-white ring-slate-800"
                : "bg-white text-slate-600 ring-slate-300"
            }`}
          >
            Assigned to me
          </Link>
        </div>
      )}

      {stateFilter === "UNDER_REVIEW" ? (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          🛑 These entries were held by the anti-bot system. Open an entry and
          use “Clear Anti-Bot Hold” to release it into PENDING_REVIEW.
        </div>
      ) : null}

      <Card>
        <SubmissionTable
          submissions={items}
          emptyMessage="The queue is empty."
        />
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        {items.length} entr{items.length === 1 ? "y" : "ies"}
        {stateFilter ? ` in ${STATE_LABEL[stateFilter]}` : ""} · open an entry
        to review it{canManage ? ", assign it, or override its state" : ""}.
      </p>
    </div>
  );
}
