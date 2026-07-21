import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { store } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { Card, EmptyState, PageTitle, StateBadge } from "@/components/ui";
import type { EntryState } from "@/lib/types";

export const metadata: Metadata = { title: "Review History" };

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (
    !["LEXICAL_EDITOR", "CHIEF_LEXICAL_EDITOR"].includes(session.role)
  )
    redirect("/dashboard");

  const decisions: {
    submissionId: string;
    word: string;
    from: EntryState | null;
    to: EntryState;
    comment?: string;
    timestamp: string;
  }[] = [];
  for (const s of store.submissions) {
    for (const h of s.history) {
      if (h.actorId === session.userId && h.from !== null) {
        decisions.push({
          submissionId: s.id,
          word: s.writtenForm,
          from: h.from,
          to: h.to,
          comment: h.comment,
          timestamp: h.timestamp,
        });
      }
    }
  }
  decisions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title={
          session.role === "LEXICAL_EDITOR"
            ? "My Review History"
            : "My Validation History"
        }
        subtitle="Every validation decision you have made, in reverse chronological order."
      />
      {decisions.length === 0 ? (
        <EmptyState title="No decisions yet" message="Your review actions will appear here." />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-50">
            {decisions.map((d, i) => (
              <li key={i} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/dashboard/submissions/${d.submissionId}`}
                    className="font-bengali text-base font-bold text-slate-800 hover:text-emerald-700"
                  >
                    {d.word}
                  </Link>
                  <span className="text-xs text-slate-400">{d.from} →</span>
                  <StateBadge state={d.to} />
                  <span className="ml-auto text-xs text-slate-400">
                    {formatDateTime(d.timestamp)}
                  </span>
                </div>
                {d.comment ? (
                  <p className="font-bengali mt-1 text-xs text-slate-500">
                    💬 {d.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
