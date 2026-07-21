import Link from "next/link";
import { store, userById } from "@/lib/store";
import {
  countsByState,
  queueAgeBuckets,
  quorumInfo,
  submissionsFor,
  weeklySubmissionSeries,
} from "@/lib/queries";
import { timeAgo, nowMs } from "@/lib/format";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { BarList, ColumnChart } from "@/components/charts";
import { SubmissionTable } from "./SubmissionTable";
import type { Session } from "@/lib/types";

const DAY = 24 * 3600 * 1000;

function decisionsBy(userId: string) {
  const decisions: {
    word: string;
    submissionId: string;
    action: string;
    timestamp: string;
  }[] = [];
  for (const s of store.submissions) {
    for (const h of s.history) {
      if (h.actorId === userId && h.from !== null) {
        decisions.push({
          word: s.writtenForm,
          submissionId: s.id,
          action: `${h.from} → ${h.to}`,
          timestamp: h.timestamp,
        });
      }
    }
  }
  return decisions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/* ------------------------------------------------------------------ */
/* Lexical Editor dashboard (SRS §7.4.1)                               */
/* ------------------------------------------------------------------ */

export function EditorDashboard({ session }: { session: Session }) {
  const now = nowMs();
  const counts = countsByState();
  const queue = submissionsFor((s) => s.state === "PENDING_REVIEW");
  const mine = queue.filter((s) => s.assignedTo === session.userId);
  const avgAgeDays =
    queue.length === 0
      ? 0
      : Math.round(
          queue.reduce(
            (acc, s) => acc + (now - new Date(s.updatedAt).getTime()),
            0
          ) /
            queue.length /
            DAY
        );
  const myDecisions = decisionsBy(session.userId);
  const weekAgo = now - 7 * DAY;
  const thisWeek = myDecisions.filter(
    (d) => new Date(d.timestamp).getTime() > weekAgo
  );
  const cFlaggedReturns = submissionsFor(
    (s) =>
      s.state === "PENDING_REVIEW" &&
      s.history.some((h) => h.to === "C_FLAGGED")
  );
  const myCases = store.cases.filter(
    (c) => c.claimantId === session.userId || c.accusedId === session.userId
  );

  return (
    <div className="space-y-6">
      {/* ① queue counters */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending review queue" value={counts.PENDING_REVIEW} tone="blue" href="/dashboard/queue" />
        <StatCard label="Assigned to me" value={mine.length} tone="purple" href="/dashboard/queue?assigned=me" />
        <StatCard label="Average queue age" value={`${avgAgeDays}d`} hint="days since last update" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ② queue age distribution */}
        <Card>
          <CardHeader title="Queue age distribution" subtitle="PENDING_REVIEW entries by age" />
          <div className="p-5">
            <BarList data={queueAgeBuckets("PENDING_REVIEW")} />
          </div>
        </Card>

        {/* ③ my review activity */}
        <Card>
          <CardHeader title="My review activity" subtitle="Decisions this week" />
          <div className="grid grid-cols-3 gap-2 p-4 sm:gap-3 sm:p-5">
            {[
              { label: "Approved", value: thisWeek.filter((d) => d.action.endsWith("EDITOR_APPROVED")).length, cls: "text-emerald-700" },
              { label: "Flagged", value: thisWeek.filter((d) => d.action.endsWith("FLAGGED") && !d.action.endsWith("C_FLAGGED")).length, cls: "text-amber-700" },
              { label: "Rejected", value: thisWeek.filter((d) => d.action.endsWith("REJECTED")).length, cls: "text-rose-700" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl bg-slate-50 p-3 text-center sm:p-4">
                <p className={`text-xl font-bold sm:text-2xl ${c.cls}`}>{c.value}</p>
                <p className="text-[10px] text-slate-500 sm:text-xs">{c.label}</p>
              </div>
            ))}
          </div>
          {/* ⑦ recent decisions */}
          <CardHeader title="Recent decisions" />
          <ul className="divide-y divide-slate-50 pb-2">
            {myDecisions.slice(0, 6).map((d, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm sm:gap-3 sm:px-5">
                <Link href={`/dashboard/submissions/${d.submissionId}`} className="font-bengali min-w-0 font-semibold text-slate-700 hover:text-emerald-700">
                  {d.word}
                </Link>
                <span className="min-w-0 break-all font-mono text-[10px] text-slate-400">{d.action}</span>
                <span className="ml-auto shrink-0 text-[10px] text-slate-300">{timeAgo(d.timestamp)}</span>
              </li>
            ))}
            {myDecisions.length === 0 ? (
              <li className="px-5 py-4 text-sm italic text-slate-400">No decisions yet.</li>
            ) : null}
          </ul>
        </Card>
      </div>

      {/* ④ C_FLAGGED returns */}
      {cFlaggedReturns.length > 0 ? (
        <Card>
          <CardHeader
            title="C-flagged returns"
            subtitle="Previously C-flagged by the CLE, corrected by the contributor, awaiting your re-review"
          />
          <SubmissionTable submissions={cFlaggedReturns} />
        </Card>
      ) : null}

      {/* ⑤⑥ escalations & disputes against me */}
      <Card>
        <CardHeader
          title="Arbitration involving me"
          subtitle="Escalations I raised and contributor disputes against my decisions"
          action={
            <Link href="/dashboard/arbitration" className="text-xs font-semibold text-emerald-700 hover:underline">
              Open arbitration →
            </Link>
          }
        />
        <ul className="divide-y divide-slate-50">
          {myCases.length === 0 ? (
            <li className="px-5 py-5 text-sm italic text-slate-400">
              No active cases involve you.
            </li>
          ) : (
            myCases.map((c) => {
              const sub = store.submissions.find((s) => s.id === c.submissionId);
              const q = quorumInfo(c);
              const accused = c.accusedId === session.userId;
              const deadlineMs = new Date(c.responseDeadline).getTime();
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm">
                  <Link href={`/dashboard/arbitration/${c.id}`} className="font-bengali font-bold text-slate-800 hover:text-emerald-700">
                    {sub?.writtenForm}
                  </Link>
                  <span className="text-xs text-slate-400">
                    {accused ? "dispute against me" : "my escalation"} · by {userById(c.claimantId)?.name}
                  </span>
                  <span className="ml-auto text-xs font-semibold text-purple-700">
                    {c.status === "RESPONSE_WINDOW" && accused && deadlineMs > now
                      ? `⏳ respond ${timeAgo(c.responseDeadline)}`
                      : c.status === "RESOLVED"
                        ? `verdict: ${c.finalVerdict?.replaceAll("_", " ").toLowerCase()}`
                        : `${q.cast}/${q.needed} votes`}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </Card>

      <div className="text-right">
        <Link
          href="/dashboard/queue"
          className="inline-block rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
        >
          Go to Review Queue ({counts.PENDING_REVIEW}) →
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chief Lexical Editor dashboard (SRS §7.5.2)                         */
/* ------------------------------------------------------------------ */

export function ChiefDashboard({ session }: { session: Session }) {
  const now = nowMs();
  const counts = countsByState();
  const queue = submissionsFor((s) => s.state === "EDITOR_APPROVED");
  const mine = queue.filter((s) => s.assignedTo === session.userId);
  const avgAgeDays =
    queue.length === 0
      ? 0
      : Math.round(
          queue.reduce(
            (acc, s) => acc + (now - new Date(s.updatedAt).getTime()),
            0
          ) /
            queue.length /
            DAY
        );
  const myDecisions = decisionsBy(session.userId);
  const weekAgo = now - 7 * DAY;
  const thisWeek = myDecisions.filter((d) => new Date(d.timestamp).getTime() > weekAgo);
  const myCases = store.cases.filter(
    (c) => c.claimantId === session.userId || c.accusedId === session.userId
  );
  const validatedSeries = weeklySubmissionSeries(8, (s) => s.state === "VALIDATED");

  return (
    <div className="space-y-6">
      {/* ① queue counter */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting final validation" value={counts.EDITOR_APPROVED} tone="purple" href="/dashboard/queue" />
        <StatCard label="Assigned to me" value={mine.length} tone="blue" href="/dashboard/queue?assigned=me" />
        <StatCard label="Average queue age" value={`${avgAgeDays}d`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ⑤ throughput cards */}
        <Card>
          <CardHeader title="My validation throughput" subtitle="This week" />
          <div className="grid grid-cols-3 gap-2 p-4 sm:gap-3 sm:p-5">
            {[
              { label: "Validated", value: thisWeek.filter((d) => d.action.endsWith("VALIDATED")).length, cls: "text-emerald-700" },
              { label: "C-Flagged", value: thisWeek.filter((d) => d.action.endsWith("C_FLAGGED")).length, cls: "text-fuchsia-700" },
              { label: "Escalated", value: thisWeek.filter((d) => d.action.endsWith("ARBITRATION")).length, cls: "text-purple-700" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl bg-slate-50 p-3 text-center sm:p-4">
                <p className={`text-xl font-bold sm:text-2xl ${c.cls}`}>{c.value}</p>
                <p className="text-[10px] text-slate-500 sm:text-xs">{c.label}</p>
              </div>
            ))}
          </div>
          {/* ⑥ timeline */}
          <CardHeader title="Platform validation timeline" subtitle="Validated entries per week (8 weeks)" />
          <div className="p-5">
            <ColumnChart data={validatedSeries} color="#576139" />
          </div>
        </Card>

        {/* ⑦ recent decisions + ②③④ panels */}
        <Card>
          <CardHeader title="Recent decisions" subtitle="My final approvals and C-flags" />
          <ul className="divide-y divide-slate-50">
            {myDecisions.slice(0, 8).map((d, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <Link href={`/dashboard/submissions/${d.submissionId}`} className="font-bengali font-semibold text-slate-700 hover:text-emerald-700">
                  {d.word}
                </Link>
                <span className="font-mono text-[10px] text-slate-400">{d.action}</span>
                <span className="ml-auto text-[10px] text-slate-300">{timeAgo(d.timestamp)}</span>
              </li>
            ))}
            {myDecisions.length === 0 ? (
              <li className="px-5 py-4 text-sm italic text-slate-400">No decisions yet.</li>
            ) : null}
          </ul>
          <CardHeader title="Arbitration involving me" />
          <ul className="divide-y divide-slate-50 pb-2">
            {myCases.length === 0 ? (
              <li className="px-5 py-4 text-sm italic text-slate-400">No active cases involve you.</li>
            ) : (
              myCases.map((c) => {
                const sub = store.submissions.find((s) => s.id === c.submissionId);
                const q = quorumInfo(c);
                return (
                  <li key={c.id} className="flex items-center gap-2 px-5 py-2.5 text-sm">
                    <Link href={`/dashboard/arbitration/${c.id}`} className="font-bengali font-bold text-slate-800 hover:text-emerald-700">
                      {sub?.writtenForm}
                    </Link>
                    <span className="ml-auto text-xs font-semibold text-purple-700">
                      {c.status === "RESOLVED" ? "resolved" : `${q.cast}/${q.needed} votes`}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </Card>
      </div>

      {/* main queue table */}
      <Card>
        <CardHeader
          title="Linguistic review queue"
          subtitle="EDITOR_APPROVED entries awaiting your definitive linguistic validation"
          action={
            <Link href="/dashboard/queue" className="text-xs font-semibold text-emerald-700 hover:underline">
              Open full queue →
            </Link>
          }
        />
        <SubmissionTable
          submissions={queue.slice(0, 8)}
          emptyMessage="The linguistic review queue is empty — great work!"
        />
      </Card>
      <p className="text-right text-xs text-slate-300">
        Signed in as {session.name} · only your approval (or a binding panel
        verdict) promotes entries to VALIDATED
      </p>
    </div>
  );
}
