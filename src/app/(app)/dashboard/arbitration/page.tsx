import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { store, userById } from "@/lib/store";
import { quorumInfo } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageTitle } from "@/components/ui";
import type { ArbitrationCase } from "@/lib/types";

export const metadata: Metadata = { title: "Arbitration" };

function statusBadge(c: ArbitrationCase) {
  const map: Record<ArbitrationCase["status"], string> = {
    RESPONSE_WINDOW: "bg-sky-50 text-sky-700 ring-sky-200",
    ACTIVE: "bg-purple-50 text-purple-700 ring-purple-200",
    TIE_PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
    RESOLVED: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${map[c.status]}`}
    >
      {c.status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

export default async function ArbitrationListPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isCurator = session.role === "ARBITRATION_CURATOR";
  const isManager = ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR"].includes(
    session.role
  );
  const cases = store.cases.filter((c) => {
    if (isCurator || isManager) return true;
    return c.claimantId === session.userId || c.accusedId === session.userId;
  });

  const title = isCurator
    ? "Arbitration Cases"
    : isManager
      ? "Arbitration Oversight & Tie-Breaker"
      : session.role === "CONTRIBUTOR"
        ? "My Disputes"
        : "My Escalations & Disputes";

  const groups: { label: string; items: ArbitrationCase[]; hint?: string }[] = [
    {
      label: "Active — open for voting",
      items: cases.filter((c) => c.status === "ACTIVE"),
      hint: isCurator ? "Cast your vote from the case view." : undefined,
    },
    {
      label: "Tie — System Moderator verdict pending",
      items: cases.filter((c) => c.status === "TIE_PENDING"),
    },
    {
      label: "Response window open (72 hours)",
      items: cases.filter((c) => c.status === "RESPONSE_WINDOW"),
      hint: "The accused party may submit a counter-claim before voting begins.",
    },
    {
      label: "Resolved",
      items: cases.filter((c) => c.status === "RESOLVED"),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title={title}
        subtitle="Formal dispute resolution: 72-hour response window → panel voting (2/3 quorum) → majority verdict, with System Moderator tie-breaks."
      />

      {cases.length === 0 ? (
        <EmptyState
          title="No arbitration cases"
          message="Disputes can be raised from FLAGGED or C-FLAGGED submissions; editors may escalate persistent disagreements."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) =>
            g.items.length === 0 ? null : (
              <Card key={g.label}>
                <CardHeader title={g.label} subtitle={g.hint} />
                <ul className="divide-y divide-slate-50">
                  {g.items.map((c) => {
                    const sub = store.submissions.find(
                      (s) => s.id === c.submissionId
                    );
                    const q = quorumInfo(c);
                    const myVoteDone = c.votes.some(
                      (v) => v.curatorId === session.userId
                    );
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/dashboard/arbitration/${c.id}`}
                          className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-slate-50/70"
                        >
                          <span className="font-bengali text-lg font-bold text-slate-800">
                            {sub?.writtenForm}
                          </span>
                          <span className="font-mono text-[10px] text-slate-300">
                            {c.id}
                          </span>
                          {statusBadge(c)}
                          <span className="text-xs text-slate-400">
                            {c.disputeType.replaceAll("_", " ").toLowerCase()} ·{" "}
                            {userById(c.claimantId)?.name} vs{" "}
                            {userById(c.accusedId)?.name} · {timeAgo(c.openedAt)}
                          </span>
                          <span className="ml-auto text-xs font-semibold text-slate-500">
                            {c.status === "RESOLVED"
                              ? `verdict: ${c.finalVerdict?.replaceAll("_", " ").toLowerCase()}${c.verdictBy === "TIE_BREAK" ? " (tie-break)" : ""}`
                              : c.status === "ACTIVE"
                                ? `${q.cast}/${q.needed} votes${isCurator ? (myVoteDone ? " · ✓ voted" : " · awaiting my vote") : ""}`
                                : c.status === "TIE_PENDING"
                                  ? `${q.approve}–${q.reject} draw`
                                  : `window closes ${timeAgo(c.responseDeadline)}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
