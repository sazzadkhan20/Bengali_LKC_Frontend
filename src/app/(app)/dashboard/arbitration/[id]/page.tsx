import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store, userById } from "@/lib/store";
import { quorumInfo } from "@/lib/queries";
import { synsetById } from "@/lib/lexicon";
import { formatDateTime, ROLE_LABEL, timeAgo, nowMs } from "@/lib/format";
import {
  Card,
  CardHeader,
  IdChip,
  PageTitle,
  PosBadge,
  StateBadge,
} from "@/components/ui";
import {
  CaseButton,
  RespondPanel,
  TieBreakPanel,
  VotePanel,
} from "@/components/dashboard/ArbitrationActions";

export const metadata: Metadata = { title: "Arbitration Case" };

export default async function ArbitrationCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const c = store.cases.find((x) => x.id === id);
  if (!c) notFound();
  const sub = store.submissions.find((s) => s.id === c.submissionId);
  if (!sub) notFound();

  const isCurator = session.role === "ARBITRATION_CURATOR";
  const isManager = ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR"].includes(session.role);
  const isParty =
    c.claimantId === session.userId || c.accusedId === session.userId;
  if (!isCurator && !isManager && !isParty) redirect("/dashboard/arbitration");

  const q = quorumInfo(c);
  const myVote = c.votes.find((v) => v.curatorId === session.userId);
  const excluded = c.excludedCuratorIds.includes(session.userId);
  const windowExpired =
    new Date(c.responseDeadline).getTime() < nowMs() &&
    c.status === "RESPONSE_WINDOW";
  const canSeeRationales = isCurator || isManager;
  const synset = sub.synsetId ? synsetById.get(sub.synsetId) : undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <nav className="mb-4 text-xs text-slate-400">
        <Link href="/dashboard/arbitration" className="hover:text-emerald-700">
          Arbitration
        </Link>{" "}
        / <span className="font-mono text-slate-600">{c.id}</span>
      </nav>
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-bengali">{sub.writtenForm}</span>
            <PosBadge pos={sub.pos} />
            <StateBadge state={sub.state} />
          </span>
        }
        subtitle={`${c.disputeType.replaceAll("_", " ")} · opened ${formatDateTime(c.openedAt)} · ${userById(c.claimantId)?.name} (claimant) vs ${userById(c.accusedId)?.name} (accused)`}
      />

      {/* status banner */}
      <div
        className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
          c.status === "RESOLVED"
            ? "border-slate-200 bg-white text-slate-700"
            : c.status === "TIE_PENDING"
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : c.status === "ACTIVE"
                ? "border-purple-300 bg-purple-50 text-purple-800"
                : "border-sky-300 bg-sky-50 text-sky-800"
        }`}
      >
        {c.status === "RESOLVED" ? (
          <p>
            <strong>Final verdict:</strong>{" "}
            {c.finalVerdict?.replaceAll("_", " ").toLowerCase()}{" "}
            {c.verdictBy === "TIE_BREAK"
              ? `(tie broken by ${userById(c.tieBrokenBy ?? "")?.name})`
              : "(panel majority)"}{" "}
            · resolved {c.resolvedAt ? formatDateTime(c.resolvedAt) : ""}
            {c.correctionNote
              ? ` · correction note ${c.correctionApplied ? "applied" : "pending with System Moderator"}`
              : ""}
          </p>
        ) : c.status === "TIE_PENDING" ? (
          <p>
            <strong>Draw ({q.approve}–{q.reject}).</strong> Awaiting the System
            Moderator&apos;s tie-breaking verdict.
          </p>
        ) : c.status === "ACTIVE" ? (
          <p>
            <strong>Voting open.</strong> {q.cast} of {q.eligible} eligible
            curators have voted — {Math.max(q.needed - q.cast, 0)} more needed
            for the 2/3 quorum. Current tally: {q.approve} approve · {q.reject}{" "}
            reject (identities hidden).
          </p>
        ) : (
          <p>
            <strong>Response window open.</strong> The accused party may submit
            a counter-claim until {formatDateTime(c.responseDeadline)} (
            {timeAgo(c.responseDeadline)}).
          </p>
        )}
      </div>

      {/* Side-by-side claim view (SRS §7.6.4) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader
            title={`Claimant — ${userById(c.claimantId)?.name}`}
            subtitle={ROLE_LABEL[userById(c.claimantId)?.role ?? "CONTRIBUTOR"]}
          />
          <div className="space-y-3 p-5 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-bengali text-xl font-bold">{sub.writtenForm}</span>
              <PosBadge pos={sub.pos} />
              {sub.synsetId ? <IdChip id={sub.synsetId} /> : null}
              {sub.iliCode || synset ? (
                <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                  ILI {sub.iliCode ?? synset?.ili}
                </span>
              ) : null}
            </p>
            {sub.definitionText ? (
              <p className="font-bengali rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                {sub.definitionText}
              </p>
            ) : null}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Dispute note
              </p>
              <p className="font-bengali mt-1 rounded-lg bg-emerald-50 px-3 py-2 text-slate-700 ring-1 ring-inset ring-emerald-100">
                {c.disputeNote}
              </p>
            </div>
            <Link
              href={`/dashboard/submissions/${sub.id}`}
              className="inline-block text-xs font-semibold text-emerald-700 hover:underline"
            >
              View full submission record →
            </Link>
          </div>
        </Card>

        <Card className="border-l-4 border-l-rose-400">
          <CardHeader
            title={`Accused — ${userById(c.accusedId)?.name}`}
            subtitle={ROLE_LABEL[userById(c.accusedId)?.role ?? "LEXICAL_EDITOR"]}
          />
          <div className="p-5 text-sm">
            {c.counterClaim ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Counter-claim
                </p>
                <p className="font-bengali mt-1 rounded-lg bg-rose-50 px-3 py-2 text-slate-700 ring-1 ring-inset ring-rose-100">
                  {c.counterClaim}
                </p>
              </>
            ) : c.status === "RESPONSE_WINDOW" ? (
              <p className="italic text-slate-400">
                Awaiting response — the 72-hour window closes{" "}
                {timeAgo(c.responseDeadline)}.
              </p>
            ) : (
              <p className="italic text-slate-400">
                No response submitted within the 72-hour window. The absence is
                noted in the case record (SRS §7.6.4).
              </p>
            )}
            {c.accusedId === session.userId && c.status === "RESPONSE_WINDOW" ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <RespondPanel caseId={c.id} />
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Submission & validation history */}
      <Card className="mt-6">
        <CardHeader
          title="Submission & validation history"
          subtitle="Full chronological timeline of state transitions"
        />
        <ol className="thin-scroll flex gap-3 overflow-x-auto px-5 py-4">
          {sub.history.map((h, i) => (
            <li
              key={i}
              className="min-w-44 shrink-0 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
            >
              <p className="text-xs font-bold text-slate-700">
                {h.from ? `${h.from} →` : "Created as"} {h.to}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {h.actorId === "system" ? "System" : userById(h.actorId)?.name} ·{" "}
                {formatDateTime(h.timestamp)}
              </p>
              {h.comment ? (
                <p className="font-bengali mt-1 line-clamp-3 text-[11px] text-slate-500">
                  {h.comment}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </Card>

      {/* Votes */}
      <Card className="mt-6">
        <CardHeader
          title={`Panel votes (${q.cast} cast · quorum ${q.needed} of ${q.eligible})`}
          subtitle={
            canSeeRationales
              ? "Full vote record — visible to curators and moderators only"
              : "Aggregated tally only — individual curator votes are confidential"
          }
        />
        <div className="p-5">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="bg-emerald-500"
              style={{ width: `${(q.approve / Math.max(q.eligible, 1)) * 100}%` }}
            />
            <div
              className="bg-rose-400"
              style={{ width: `${(q.reject / Math.max(q.eligible, 1)) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {q.approve} approve · {q.reject} reject ·{" "}
            {q.eligible - q.cast} not yet voted
            {c.excludedCuratorIds.length > 0
              ? ` · ${c.excludedCuratorIds.length} excluded (conflict of interest)`
              : ""}
          </p>

          {canSeeRationales && c.votes.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {c.votes.map((v, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-slate-700">
                    {userById(v.curatorId)?.name} —{" "}
                    <span
                      className={
                        v.verdict === "REJECT"
                          ? "text-rose-600"
                          : "text-emerald-700"
                      }
                    >
                      {v.verdict.replaceAll("_", " ").toLowerCase()}
                    </span>
                    <span className="ml-2 text-[10px] font-normal text-slate-400">
                      {formatDateTime(v.votedAt)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{v.rationale}</p>
                  {v.correctionNote ? (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      🩹 Correction note: {v.correctionNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Card>

      {/* Action panels */}
      {isCurator && c.status === "ACTIVE" && !myVote && !excluded ? (
        <Card className="mt-6 ring-2 ring-purple-200">
          <CardHeader
            title="Cast your vote"
            subtitle="Your vote is binding once quorum and majority are reached"
          />
          <div className="p-5">
            <VotePanel caseId={c.id} hasAccusedVersion={!!c.counterClaim} />
          </div>
        </Card>
      ) : null}
      {isCurator && excluded ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ Conflict of interest: you are a party to this case and have been
          automatically excluded from voting (SRS §7.6.1).
        </p>
      ) : null}
      {isCurator && myVote ? (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ You voted{" "}
          <strong>{myVote.verdict.replaceAll("_", " ").toLowerCase()}</strong>{" "}
          on {formatDateTime(myVote.votedAt)}.
        </p>
      ) : null}

      {hasPermission(session.role, "tie_breaker") && c.status === "TIE_PENDING" ? (
        <Card className="mt-6 ring-2 ring-amber-300">
          <CardHeader
            title="System Moderator tie-break"
            subtitle="The panel vote ended in a draw — your verdict is final and binding"
          />
          <div className="p-5">
            <TieBreakPanel caseId={c.id} />
          </div>
        </Card>
      ) : null}

      {isManager && windowExpired ? (
        <Card className="mt-6">
          <CardHeader
            title="Response window expired"
            subtitle="No counter-claim was submitted — activate the case for panel voting"
          />
          <div className="p-5">
            <CaseButton
              caseId={c.id}
              action="activate"
              label="Activate Case for Voting"
            />
          </div>
        </Card>
      ) : null}

      {hasPermission(session.role, "apply_corrections") &&
      c.status === "RESOLVED" &&
      c.correctionNote &&
      !c.correctionApplied ? (
        <Card className="mt-6">
          <CardHeader
            title="Apply panel correction"
            subtitle={`Correction note: ${c.correctionNote}`}
          />
          <div className="p-5">
            <CaseButton
              caseId={c.id}
              action="apply_correction"
              label="🩹 Mark Correction as Applied"
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
