import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { STATE_LABEL } from "@/lib/format";
import { PageTitle } from "@/components/ui";
import { SubmissionBrowser } from "@/components/dashboard/SubmissionBrowser";
import type { EntryState } from "@/lib/types";

export const metadata: Metadata = { title: "My Submissions" };

const STATES = Object.keys(STATE_LABEL) as EntryState[];

export default async function MySubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "quick_input")) redirect("/dashboard/queue");

  const params = await searchParams;
  const initialState = STATES.includes(params.state as EntryState)
    ? (params.state as EntryState)
    : undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title="My Submissions"
        subtitle="Every lexical entry you have submitted, filterable by lifecycle state."
        action={
          <Link
            href="/dashboard/quick-input"
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            + New Entry
          </Link>
        }
      />
      <SubmissionBrowser
        mode="mine"
        initialState={initialState}
        initialQuery={typeof params.q === "string" ? params.q.slice(0, 100) : ""}
        emptyMessage="You haven't submitted any entries in this state yet."
      />
    </div>
  );
}
