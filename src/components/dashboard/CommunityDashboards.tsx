import Link from "next/link";
import { activeCurators, store, userById } from "@/lib/store";
import {
  quorumInfo,
  submissionsFor,
  weeklySubmissionSeries,
} from "@/lib/queries";
import { timeAgo, nowMs } from "@/lib/format";
import { Card, CardHeader, StatCard, StateBadge } from "@/components/ui";
import { ColumnChart } from "@/components/charts";
import { SubmissionTable } from "./SubmissionTable";
import type { Session } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Lexical Contributor dashboard (SRS §7.3.1)                          */
/* ------------------------------------------------------------------ */

export function ContributorDashboard({ session }: { session: Session }) {
  const now = nowMs();
  const mine = submissionsFor((s) => s.contributorId === session.userId);
  const pending = mine.filter((s) =>
    ["PENDING_REVIEW", "UNDER_REVIEW", "EDITOR_APPROVED"].includes(s.state)
  ).length;
  const validated = mine.filter((s) => s.state === "VALIDATED").length;
  const rejected = mine.filter((s) => s.state === "REJECTED").length;
  const flagged = mine.filter((s) =>
    ["FLAGGED", "C_FLAGGED"].includes(s.state)
  );
  const myDisputes = store.cases.filter((c) => c.claimantId === session.userId);
  const sessionUsed = Math.min(
    mine.filter(
      (s) => now - new Date(s.createdAt).getTime() < 24 * 3600 * 1000
    ).length,
    store.config.maxEntriesPerSession
  );
  const series = weeklySubmissionSeries(
    8,
    (s) => s.contributorId === session.userId
  );

  return (
    <div className="space-y-6">
      {/* ① contribution summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total submitted" value={mine.length} href="/dashboard/submissions" />
        <StatCard label="Pending review" value={pending} tone="blue" href="/dashboard/submissions?state=PENDING_REVIEW" />
        <StatCard label="Validated" value={validated} tone="green" href="/dashboard/submissions?state=VALIDATED" />
        <StatCard label="Rejected" value={rejected} tone="red" href="/dashboard/submissions?state=REJECTED" />
      </div>

      {/* ⑤ session quota + ⑥ quick input CTA */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Session quota"
            subtitle="Anti-bot rate limits for your account"
          />
          <div className="space-y-5 p-5">
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  This session
                </span>
                <span className="tabular-nums text-slate-400">
                  {sessionUsed} / {store.config.maxEntriesPerSession}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{
                    width: `${(sessionUsed / store.config.maxEntriesPerSession) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  Rolling 24 hours
                </span>
                <span className="tabular-nums text-slate-400">
                  {sessionUsed} / {store.config.maxEntriesPerDay}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{
                    width: `${(sessionUsed / store.config.maxEntriesPerDay) * 100}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Exceeding {store.config.suspensionThreshold} entries in any
              window triggers automatic account suspension pending Platform
              Architect review (SRS §4.2).
            </p>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center bg-gradient-to-br from-emerald-700 to-emerald-800 p-8 text-center">
          <p className="font-bengali text-2xl font-bold text-white">
            নতুন শব্দ যোগ করুন
          </p>
          <p className="mt-1 text-xs text-emerald-100">
            Add a new Bengali lexical entry via Quick Input
          </p>
          <Link
            href="/dashboard/quick-input"
            className="mt-5 rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-emerald-50"
          >
            + Add New Entry
          </Link>
        </Card>
      </div>

      {/* ③ flagged entries requiring attention */}
      {flagged.length > 0 ? (
        <Card className="ring-2 ring-amber-200">
          <CardHeader
            title="⚠ Entries requiring your attention"
            subtitle="Returned to you with reviewer comments — edit and resubmit, or raise a dispute"
          />
          <ul className="divide-y divide-slate-50">
            {flagged.map((s) => (
              <li key={s.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bengali text-lg font-bold text-slate-800">
                    {s.writtenForm}
                  </span>
                  <StateBadge state={s.state} />
                  <Link
                    href={`/dashboard/submissions/${s.id}`}
                    className="ml-auto rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
                  >
                    Edit & Resubmit →
                  </Link>
                </div>
                <p className="font-bengali mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-100">
                  💬 {s.state === "C_FLAGGED" ? s.cleComment : s.editorComment}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ② recent submissions */}
        <Card>
          <CardHeader
            title="My recent submissions"
            action={
              <Link href="/dashboard/submissions" className="text-xs font-semibold text-emerald-700 hover:underline">
                View all →
              </Link>
            }
          />
          <SubmissionTable
            submissions={mine.slice(0, 10)}
            emptyMessage="You haven't submitted any entries yet — try Quick Input!"
          />
        </Card>

        <div className="space-y-6">
          {/* ④ dispute status */}
          <Card>
            <CardHeader
              title="Dispute status"
              subtitle="Cases you escalated to the Arbitration Curator panel"
            />
            <ul className="divide-y divide-slate-50">
              {myDisputes.length === 0 ? (
                <li className="px-5 py-5 text-sm italic text-slate-400">
                  No disputes filed. You may dispute REJECTED, FLAGGED or
                  C-FLAGGED entries.
                </li>
              ) : (
                myDisputes.map((c) => {
                  const sub = store.submissions.find((s) => s.id === c.submissionId);
                  const q = quorumInfo(c);
                  return (
                    <li key={c.id} className="px-5 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dashboard/arbitration/${c.id}`} className="font-bengali font-bold text-slate-800 hover:text-emerald-700">
                          {sub?.writtenForm}
                        </Link>
                        <span className="text-xs text-slate-400">{timeAgo(c.openedAt)}</span>
                        <span className="ml-auto rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-200">
                          {c.status === "RESPONSE_WINDOW"
                            ? "awaiting response window"
                            : c.status === "RESOLVED"
                              ? `verdict: ${c.finalVerdict?.replaceAll("_", " ").toLowerCase()}`
                              : `${q.approve} approve · ${q.reject} reject`}
                        </span>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>

          {/* ⑦ contribution timeline */}
          <Card>
            <CardHeader title="My contribution timeline" subtitle="Entries per week, last 8 weeks" />
            <div className="p-5">
              <ColumnChart data={series} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Arbitration Curator dashboard (SRS §7.6.2)                          */
/* ------------------------------------------------------------------ */

export function CuratorDashboard({ session }: { session: Session }) {
  const open = store.cases.filter((c) => c.status === "ACTIVE");
  const inWindow = store.cases.filter((c) => c.status === "RESPONSE_WINDOW");
  const ties = store.cases.filter((c) => c.status === "TIE_PENDING");
  const resolved = store.cases.filter((c) => c.status === "RESOLVED");
  const votedByMe = store.cases.filter((c) =>
    c.votes.some((v) => v.curatorId === session.userId)
  );
  const awaitingMe = open.filter(
    (c) =>
      !c.votes.some((v) => v.curatorId === session.userId) &&
      !c.excludedCuratorIds.includes(session.userId)
  );
  const myVotes = store.cases.flatMap((c) =>
    c.votes.filter((v) => v.curatorId === session.userId)
  );

  return (
    <div className="space-y-6">
      {/* ① active cases counter */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open for voting" value={open.length} tone="purple" href="/dashboard/arbitration" />
        <StatCard label="I have voted" value={votedByMe.length} tone="green" />
        <StatCard label="Awaiting my vote" value={awaitingMe.length} tone="red" href="/dashboard/arbitration" />
      </div>

      {awaitingMe.length > 0 ? (
        <Link
          href="/dashboard/arbitration"
          className="block rounded-2xl border border-purple-300 bg-purple-50 px-5 py-4 text-sm font-bold text-purple-800 transition hover:bg-purple-100"
        >
          ⚖ {awaitingMe.length} case{awaitingMe.length === 1 ? "" : "s"} awaiting
          your vote — open the voting queue →
        </Link>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ② quorum status panel */}
        <Card>
          <CardHeader
            title="Quorum status"
            subtitle={`${activeCurators().length} curators registered · 2/3 quorum rule`}
          />
          <ul className="divide-y divide-slate-50">
            {open.length === 0 ? (
              <li className="px-5 py-5 text-sm italic text-slate-400">
                No cases currently open for voting.
              </li>
            ) : (
              open.map((c) => {
                const sub = store.submissions.find((s) => s.id === c.submissionId);
                const q = quorumInfo(c);
                return (
                  <li key={c.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Link href={`/dashboard/arbitration/${c.id}`} className="font-bengali font-bold text-slate-800 hover:text-emerald-700">
                        {sub?.writtenForm}
                      </Link>
                      <span className="ml-auto text-xs tabular-nums text-slate-500">
                        {q.cast}/{q.eligible} votes cast · {Math.max(q.needed - q.cast, 0)} more for quorum
                      </span>
                    </div>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="bg-emerald-500" style={{ width: `${(q.approve / Math.max(q.eligible, 1)) * 100}%` }} />
                      <div className="bg-rose-400" style={{ width: `${(q.reject / Math.max(q.eligible, 1)) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {q.approve} approve · {q.reject} reject (names hidden)
                    </p>
                  </li>
                );
              })
            )}
          </ul>
        </Card>

        <div className="space-y-6">
          {/* ③ response window */}
          <Card>
            <CardHeader
              title="Cases in response window"
              subtitle="Accused party has 72 hours to counter-claim — not yet votable"
            />
            <ul className="divide-y divide-slate-50">
              {inWindow.length === 0 ? (
                <li className="px-5 py-4 text-sm italic text-slate-400">None.</li>
              ) : (
                inWindow.map((c) => {
                  const sub = store.submissions.find((s) => s.id === c.submissionId);
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                      <span className="font-bengali font-bold text-slate-700">{sub?.writtenForm}</span>
                      <span className="ml-auto text-xs text-slate-400">
                        window closes {timeAgo(c.responseDeadline)}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>

          {/* ④ ties + ⑤ my history */}
          <Card>
            <CardHeader title="Ties pending System Moderator" />
            <ul className="divide-y divide-slate-50">
              {ties.length === 0 ? (
                <li className="px-5 py-4 text-sm italic text-slate-400">No tie votes.</li>
              ) : (
                ties.map((c) => {
                  const sub = store.submissions.find((s) => s.id === c.submissionId);
                  return (
                    <li key={c.id} className="px-5 py-3 text-sm">
                      <span className="font-bengali font-bold">{sub?.writtenForm}</span>{" "}
                      <span className="text-xs text-slate-400">awaiting tie-break verdict</span>
                    </li>
                  );
                })
              )}
            </ul>
            <CardHeader title="My arbitration history" />
            <div className="grid grid-cols-2 gap-3 p-5 pt-2">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">
                  {myVotes.filter((v) => v.verdict !== "REJECT").length}
                </p>
                <p className="text-xs text-slate-500">Approve votes</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-rose-700">
                  {myVotes.filter((v) => v.verdict === "REJECT").length}
                </p>
                <p className="text-xs text-slate-500">Reject votes</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ⑥ recently resolved */}
      <Card>
        <CardHeader title="Recently resolved" subtitle="Final verdicts with full audit trail" />
        <ul className="divide-y divide-slate-50">
          {resolved.length === 0 ? (
            <li className="px-5 py-5 text-sm italic text-slate-400">
              No resolved cases yet.
            </li>
          ) : (
            resolved.slice(0, 10).map((c) => {
              const sub = store.submissions.find((s) => s.id === c.submissionId);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm">
                  <Link href={`/dashboard/arbitration/${c.id}`} className="font-bengali font-bold text-slate-800 hover:text-emerald-700">
                    {sub?.writtenForm}
                  </Link>
                  <span className="text-xs text-slate-400">
                    {userById(c.claimantId)?.name} vs {userById(c.accusedId)?.name}
                  </span>
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {c.finalVerdict?.replaceAll("_", " ").toLowerCase()}
                    {c.verdictBy === "TIE_BREAK" ? " (tie-break)" : ""}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </Card>
    </div>
  );
}
