import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { submissionsFor } from "@/lib/queries";
import { STATE_LABEL } from "@/lib/format";
import { Card, PageTitle } from "@/components/ui";
import { SubmissionTable } from "@/components/dashboard/SubmissionTable";
import type { EntryState } from "@/lib/types";

export const metadata: Metadata = { title: "My Submissions" };

const STATES = Object.keys(STATE_LABEL) as EntryState[];

export default async function MySubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  const stateFilter = STATES.includes(params.state as EntryState)
    ? (params.state as EntryState)
    : undefined;

  const mine = submissionsFor(
    (s) =>
      s.contributorId === session.userId &&
      (!stateFilter || s.state === stateFilter)
  );

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

      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href="/dashboard/submissions"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
            !stateFilter
              ? "bg-slate-800 text-white ring-slate-800"
              : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
          }`}
        >
          All
        </Link>
        {STATES.map((s) => (
          <Link
            key={s}
            href={`/dashboard/submissions?state=${s}`}
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

      <Card>
        <SubmissionTable
          submissions={mine}
          emptyMessage={
            stateFilter
              ? `No submissions in state ${STATE_LABEL[stateFilter]}.`
              : "You haven't submitted any entries yet."
          }
        />
      </Card>
    </div>
  );
}
