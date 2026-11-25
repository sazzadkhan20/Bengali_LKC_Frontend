import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { formatDateTime, REL_LABEL, ROLE_LABEL, STATE_LABEL, timeAgo } from "@/lib/format";
import {
  Card,
  CardHeader,
  DefinitionList,
  IdChip,
  LangBadge,
  PageTitle,
  PosBadge,
  sortDefinitions,
  StateBadge,
  type DefinitionItem,
} from "@/components/ui";
import {
  ReviewActions,
  type ActionSpec,
} from "@/components/dashboard/ReviewActions";
import {
  ReviewDecisionPanel,
  type ReviewOptions,
} from "@/components/dashboard/ReviewDecisionPanel";
import {
  OwnerActionsPanel,
  type OwnerActions,
} from "@/components/dashboard/OwnerActionsPanel";
import {
  FinalStatusNotice,
  ManagerActionsPanel,
  type Lifecycle,
} from "@/components/dashboard/ManagerActionsPanel";
import type { EntryState, POS, Role, Session, Submission } from "@/lib/types";
import {
  ORIGIN_LABEL,
  outcomeLabel,
  STATUS_LABEL,
  type CaseOrigin,
  type CaseStage,
  type CaseStatus,
  type VerdictBy,
} from "@/lib/arbitration";

export const metadata: Metadata = { title: "Submission" };

type HistoryStep = Submission["history"][number] & {
  actorName?: string | null;
  secondsInPreviousState?: number | null;
};

type SubmissionDetail = Omit<Submission, "history"> & {
  history: HistoryStep[];
  /** The entry's own definitions (for a linked synset: the ones it adds). */
  definitions?: DefinitionItem[];
  lastUpdatedBy?: string | null;
  currentStateSince?: string | null;
  submittedForReviewAt?: string | null;
  users: Record<string, { name: string; role: Role }>;
  synset?: {
    id: string;
    ili: string | null;
    pos: POS | null;
    definitionText: string | null;
    definitionLanguage: string | null;
    definitions?: DefinitionItem[];
    members: string[];
  };
  iliInfo?: { ili: string; pos: POS | null; words: string | null; gloss: string | null };
  senseRelationDetails: {
    relType: string;
    target: string;
    found: boolean;
    writtenForm: string | null;
    pos: POS | null;
    synsetId: string | null;
    definition: string | null;
  }[];
  synsetRelationDetails: {
    relType: string;
    target: string;
    found: boolean;
    pos: POS | null;
    ili: string | null;
    definition: string | null;
    members: string[];
  }[];
  cases: {
    id: string;
    status: CaseStatus;
    disputeType: string | null;
    openedAt: string | null;
    finalVerdict: string | null;
    verdictBy: VerdictBy | null;
    origin: CaseOrigin | null;
    stage: CaseStage | null;
    resultingState: EntryState | null;
  }[];
  reviewers?: { id: string; name: string; role: Role }[];
  /** Present when the caller's role has a server-side review policy. */
  review?: ReviewOptions;
  /** Present only for the entry's owner. */
  ownerActions?: OwnerActions;
  version?: number | null;
  assignedChief?: string | null;
  lifecycle?: Lifecycle;
};

const CASE_STAGE: Record<string, string> = {
  RESPONSE_WINDOW:
    "72-hour response window. You can submit or update your note in the case until the daily check closes the window.",
  ACTIVE: "The arbitration panel is voting. Notes are read-only; the decision is applied automatically.",
  TIE_PENDING: "The panel vote is tied. The entry stays in arbitration until the tie is resolved.",
};

/**
 * Staff actions for roles without a server review policy; Platform Architect / System Moderator use
 * `ManagerActionsPanel` and the owner's own actions come from `ownerActions`.
 */
function actionsFor(
  session: Session,
  sub: Pick<Submission, "state">,
  hasReviewPolicy: boolean,
  isFinal: boolean
): ActionSpec[] {
  const role = session.role;
  const actions: ActionSpec[] = [];
  // Review decisions for policy roles come from the review API instead.
  if (hasReviewPolicy || isFinal) return actions;

  if (sub.state === "PENDING_REVIEW" && hasPermission(role, "primary_validate")) {
    actions.push(
      { action: "approve", label: "✓ Approve", tone: "green" },
      { action: "flag", label: "⚑ Flag for Correction", tone: "amber", needsComment: true, minComment: 15, commentLabel: "A flag comment" },
      { action: "reject", label: "✕ Reject", tone: "red", needsComment: true, minComment: 1, commentLabel: "A rejection reason" }
    );
  }
  if (sub.state === "EDITOR_APPROVED" && hasPermission(role, "final_validate")) {
    actions.push(
      { action: "validate", label: "✓ Final Approve (VALIDATED)", tone: "green" },
      { action: "cflag", label: "⚑ C-Flag (linguistic note)", tone: "fuchsia", needsComment: true, minComment: 15, commentLabel: "A linguistic note" }
    );
  }
  if (
    ["PENDING_REVIEW", "EDITOR_APPROVED", "C_FLAGGED"].includes(sub.state) &&
    hasPermission(role, "escalate")
  ) {
    actions.push({
      action: "escalate",
      label: "⚖ Escalate to Arbitration",
      tone: "purple",
      needsComment: true,
      minComment: 30,
      commentLabel: "Escalation notes",
    });
  }
  return actions;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hr`;
  return `${Math.round(seconds / 86400)} days`;
}

function stateLabel(state: string): string {
  return STATE_LABEL[state as EntryState] ?? state;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-5">
      <dt className="text-slate-400">{label}</dt>
      <dd className="col-span-2 min-w-0">{children}</dd>
    </div>
  );
}

function IliChip({ ili }: { ili: string }) {
  return (
    <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
      ILI {ili}
    </span>
  );
}

function Members({ words }: { words: string[] }) {
  if (words.length === 0) return null;
  return (
    <span className="font-bengali flex flex-wrap gap-1">
      {words.map((w) => (
        <span
          key={w}
          className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-200"
        >
          {w}
        </span>
      ))}
    </span>
  );
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const result = await backendAuthedFetch<SubmissionDetail>(
    `/api/submissions/${encodeURIComponent(id)}`
  );
  if (result.status === 404) notFound();
  if (result.status === 401) redirect("/login");
  if (result.status === 403) {
    const isReviewer = session.role === "LEXICAL_EDITOR" || session.role === "CHIEF_LEXICAL_EDITOR";
    if (!isReviewer) redirect("/dashboard");
    return (
      <div className="mx-auto max-w-3xl">
        <PageTitle title="Entry not available" subtitle={`Submission ${id}`} />
        <Card>
          <div className="flex items-start gap-3 p-5 text-sm text-slate-700">
            <span aria-hidden="true" className="text-lg leading-none">
              🔒
            </span>
            <div className="space-y-3">
              <p>
                {(result.data as { error?: string }).error ??
                  "You do not have access to this entry."}
              </p>
              <Link
                href="/dashboard/queue"
                className="inline-block text-xs font-semibold text-emerald-700 hover:underline"
              >
                ← Back to the review queue
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  if (!result.ok) {
    throw new Error(
      (result.data as { error?: string }).error ?? "Could not load submission."
    );
  }
  const sub = result.data;
  const nameOf = (userId?: string | null) =>
    !userId ? "" : userId === "system" ? "System (arbitration decision)" : (sub.users[userId]?.name ?? userId);

  const synset = sub.synset;
  const isFinal = sub.lifecycle?.final ?? (sub.state === "VALIDATED" || sub.state === "REJECTED");
  const isManager = hasPermission(session.role, "override_state");
  const actions = isManager ? [] : actionsFor(session, sub, Boolean(sub.review), isFinal);
  const ownerActions = sub.ownerActions?.actions ?? [];
  const activeCase = sub.ownerActions?.activeCase;
  const assignedNames = [
    sub.assignedTo ? `${nameOf(sub.assignedTo)} (Lexical Editor)` : null,
    sub.assignedChief ? `${nameOf(sub.assignedChief)} (Chief)` : null,
  ].filter(Boolean) as string[];
  const showReview = Boolean(
    sub.review && (sub.review.blockedReason || sub.review.decisions.length > 0)
  );
  // Feedback banners address the contributor; reviewers read the same comments in the record and timeline.
  const showFeedbackBanners =
    session.role !== "LEXICAL_EDITOR" && session.role !== "CHIEF_LEXICAL_EDITOR";
  const history = [...sub.history].reverse();
  const iliWords = sub.iliInfo?.words?.trim() || null;
  const ownDefinitions = sortDefinitions(
    sub.definitions ??
      (sub.definitionText ? [{ language: sub.definitionLanguage ?? "ben", text: sub.definitionText }] : [])
  );
  const synsetDefinitions = sortDefinitions(
    synset?.definitions ??
      (synset?.definitionText ? [{ language: synset.definitionLanguage ?? "ben", text: synset.definitionText }] : [])
  );
  /** Everything the reviewer must check: the linked synset's definitions plus the ones this entry adds. */
  // Once a linked entry is validated its definitions are on the synset too — list them once, as this entry's.
  const ownKeys = new Set(ownDefinitions.map((d) => `${d.language}|${d.text.trim()}`));
  const allDefinitions = sortDefinitions([
    ...(sub.synsetAction === "link"
      ? synsetDefinitions
          .filter((d) => !ownKeys.has(`${d.language}|${d.text.trim()}`))
          .map((d) => ({ ...d, fromSynset: true }))
      : []),
    ...ownDefinitions.map((d) => ({ ...d, fromSynset: false })),
  ]);
  const iliGlossText = sub.iliInfo?.gloss?.trim() ?? "";
  const iliGloss =
    iliGlossText && !synsetDefinitions.some((d) => d.text.trim() === iliGlossText) ? iliGlossText : null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-bengali">{sub.writtenForm}</span>
            <PosBadge pos={sub.pos} />
            <StateBadge state={sub.state} />
          </span>
        }
        subtitle={
          <span>
            Submission <code className="font-mono">{sub.id}</code> by{" "}
            {nameOf(sub.contributorId)} · {formatDateTime(sub.createdAt)}
          </span>
        }
      />

      {/* at-a-glance status strip */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Current state",
            value: stateLabel(sub.state),
            hint: sub.currentStateSince ? `since ${timeAgo(sub.currentStateSince)}` : undefined,
          },
          {
            label: "Submitted for review",
            value: sub.submittedForReviewAt ? formatDateTime(sub.submittedForReviewAt) : "Not yet",
            hint: sub.submittedForReviewAt ? timeAgo(sub.submittedForReviewAt) : "still a draft",
          },
          {
            label: "Assigned reviewers",
            value: assignedNames.length ? assignedNames[0] : "Unassigned",
            hint: assignedNames[1],
          },
          {
            label: "Last updated",
            value: formatDateTime(sub.updatedAt),
            hint: sub.lastUpdatedBy ? `by ${nameOf(sub.lastUpdatedBy)}` : undefined,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{c.label}</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">{c.value}</p>
            {c.hint ? <p className="text-xs text-slate-400">{c.hint}</p> : null}
          </div>
        ))}
      </div>

      {activeCase ? (
        <Card className="mb-5">
          <CardHeader title="Arbitration" subtitle="Your entry is under arbitration" />
          <div className="space-y-1.5 p-5 text-sm text-purple-900">
            <p>
              ⚖ This entry is linked to arbitration case{" "}
              <Link
                href={`/dashboard/arbitration/${encodeURIComponent(activeCase.id)}`}
                className="font-bold underline underline-offset-2 hover:text-purple-700"
              >
                {activeCase.id}
              </Link>{" "}
              ({STATUS_LABEL[activeCase.status as CaseStatus]?.toLowerCase() ?? "active"}).
            </p>
            {CASE_STAGE[activeCase.status] ? (
              <p className="text-xs text-slate-500">{CASE_STAGE[activeCase.status]}</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* reviewer feedback banners */}
      {showFeedbackBanners && sub.state === "FLAGGED" && sub.editorComment ? (
        <div className="font-bengali mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Lexical Editor comment:</strong> {sub.editorComment}
        </div>
      ) : null}
      {showFeedbackBanners && sub.state === "C_FLAGGED" && sub.cleComment ? (
        <div className="font-bengali mb-5 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-900">
          <strong>Chief Lexical Editor note:</strong> {sub.cleComment}
        </div>
      ) : null}
      {showFeedbackBanners && sub.state === "REJECTED" && sub.rejectionReason ? (
        <div className="font-bengali mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <strong>Rejection reason:</strong> {sub.rejectionReason}
        </div>
      ) : null}
      {sub.cases.filter((c) => c.id !== activeCase?.id).map((c) => (
        <div
          key={c.id}
          className="mb-5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900"
        >
          ⚖ Linked to arbitration case{" "}
          <Link href={`/dashboard/arbitration/${c.id}`} className="font-bold underline">
            {c.id}
          </Link>{" "}
          ({c.origin ? ORIGIN_LABEL[c.origin] : (STATUS_LABEL[c.status] ?? c.status)}
          {c.status === "RESOLVED" || c.status === "TIE_PENDING"
            ? ` · ${outcomeLabel(c.status, c.finalVerdict, c.verdictBy, c.stage ?? "EDITOR")}`
            : ` · ${STATUS_LABEL[c.status] ?? c.status}`}
          {c.resultingState ? ` → ${stateLabel(c.resultingState)}` : ""}
          {c.openedAt ? ` · opened ${formatDateTime(c.openedAt)}` : ""}).
        </div>
      ))}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* core payload */}
          <Card>
            <CardHeader title="Proposed lexical record" subtitle="Quick Input payload" />
            <dl className="divide-y divide-slate-50 text-sm">
              <Row label="Written form">
                <span className="font-bengali text-lg font-bold text-slate-900">{sub.writtenForm}</span>
              </Row>
              <Row label="Part of speech">
                <PosBadge pos={sub.pos} />
              </Row>
              <Row label="Definitions">
                {allDefinitions.length === 0 ? (
                  <em className="text-slate-400">No definition</em>
                ) : (
                  <ul className="space-y-1.5">
                    {allDefinitions.map((d) => (
                      <li key={`${d.fromSynset ? "s" : "e"}-${d.language}`} className="flex items-start gap-2">
                        <span className="pt-0.5">
                          <LangBadge lang={d.language} />
                        </span>
                        <span
                          lang={d.language === "eng" ? "en" : "bn"}
                          className={`min-w-0 break-words ${d.language === "eng" ? "" : "font-bengali"} ${
                            d.fromSynset ? "text-slate-600" : "text-slate-800"
                          }`}
                        >
                          {d.text}{" "}
                          {sub.synsetAction === "link" ? (
                            <em className="text-xs not-italic">
                              {d.fromSynset ? (
                                <span className="text-slate-400">(existing — linked synset)</span>
                              ) : (
                                <span className="font-semibold text-emerald-700">(added by this entry)</span>
                              )}
                            </em>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Row>
              {sub.reviewerNote ? (
                <Row label="Contributor note">
                  <span className="font-bengali text-slate-600">{sub.reviewerNote}</span>
                </Row>
              ) : null}
              {sub.editorComment ? (
                <Row label="Lexical Editor comment">
                  <span className="font-bengali text-slate-700">{sub.editorComment}</span>
                </Row>
              ) : null}
              {sub.cleComment ? (
                <Row label="Chief Editor comment">
                  <span className="font-bengali text-slate-700">{sub.cleComment}</span>
                </Row>
              ) : null}
              {sub.validatedBy ? (
                <Row label="Validated by">
                  <span className="font-semibold text-emerald-700">
                    {nameOf(sub.validatedBy)}
                    {sub.validatedAt ? ` · ${formatDateTime(sub.validatedAt)}` : ""}
                  </span>
                </Row>
              ) : null}
            </dl>
          </Card>

          {/* synset / concept */}
          <Card>
            <CardHeader
              title="Synset (concept)"
              subtitle={
                sub.synsetAction === "link"
                  ? "Links this word to an existing synset"
                  : "Proposes a new synset for this word"
              }
            />
            <dl className="divide-y divide-slate-50 text-sm">
              {sub.synsetAction === "link" ? (
                synset ? (
                  <>
                    <Row label="Synset">
                      <span className="flex flex-wrap items-center gap-2">
                        <Link href={`/synset/${synset.id}`}>
                          <IdChip id={synset.id} />
                        </Link>
                        {synset.pos ? <PosBadge pos={synset.pos} full={false} /> : null}
                        {synset.ili ? <IliChip ili={synset.ili} /> : null}
                      </span>
                    </Row>
                    <Row label="Definitions">
                      <DefinitionList definitions={synsetDefinitions} />
                    </Row>
                    <Row label="Existing members">
                      {synset.members.length ? (
                        <Members words={synset.members} />
                      ) : (
                        <em className="text-slate-400">none</em>
                      )}
                    </Row>
                  </>
                ) : (
                  <Row label="Synset">
                    <span className="text-rose-600">
                      {sub.synsetId ? <IdChip id={sub.synsetId} /> : null} no longer exists in the lexicon.
                    </span>
                  </Row>
                )
              ) : (
                <Row label="ILI code">
                  {sub.iliCode && sub.iliCode.toLowerCase() !== "n/a" ? (
                    <IliChip ili={sub.iliCode} />
                  ) : (
                    <span className="text-slate-500">N/A (no interlingual index)</span>
                  )}
                </Row>
              )}
              {iliWords || iliGloss ? (
                <Row label="ILI record">
                  <span className="space-y-0.5">
                    {iliWords ? (
                      <span className="block font-semibold text-slate-700">
                        {iliWords.split(",").map((w) => w.trim()).filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                    {iliGloss ? (
                      <span className="font-bengali block text-slate-500">{iliGloss}</span>
                    ) : null}
                  </span>
                </Row>
              ) : null}
            </dl>
          </Card>

          {/* relations */}
          <Card>
            <CardHeader
              title="Relations"
              subtitle={`${sub.senseRelationDetails.length} sense · ${sub.synsetRelationDetails.length} synset`}
            />
            <div className="divide-y divide-slate-50 text-sm">
              <div className="px-4 py-3 sm:px-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Sense relations
                </p>
                {sub.senseRelationDetails.length === 0 ? (
                  <em className="text-slate-400">none</em>
                ) : (
                  <ul className="space-y-2">
                    {sub.senseRelationDetails.map((r, i) => (
                      <li key={i} className="flex flex-wrap items-start gap-2">
                        <span className="rounded bg-slate-50 px-1.5 py-0.5 text-xs ring-1 ring-inset ring-slate-200">
                          {REL_LABEL[r.relType] ?? r.relType}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            {r.writtenForm ? (
                              <span className="font-bengali font-semibold text-slate-800">{r.writtenForm}</span>
                            ) : null}
                            {r.pos ? <PosBadge pos={r.pos} full={false} /> : null}
                            <IdChip id={r.target} />
                            {!r.found ? <span className="text-xs text-rose-600">not found</span> : null}
                          </span>
                          {r.definition ? (
                            <span className="font-bengali mt-0.5 block text-xs text-slate-500">{r.definition}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="px-4 py-3 sm:px-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Synset relations
                </p>
                {sub.synsetRelationDetails.length === 0 ? (
                  <em className="text-slate-400">none</em>
                ) : (
                  <ul className="space-y-2">
                    {sub.synsetRelationDetails.map((r, i) => (
                      <li key={i} className="flex flex-wrap items-start gap-2">
                        <span className="rounded bg-slate-50 px-1.5 py-0.5 text-xs ring-1 ring-inset ring-slate-200">
                          {REL_LABEL[r.relType] ?? r.relType}
                        </span>
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <Link href={`/synset/${r.target}`}>
                              <IdChip id={r.target} />
                            </Link>
                            {r.pos ? <PosBadge pos={r.pos} full={false} /> : null}
                            {r.ili ? <IliChip ili={r.ili} /> : null}
                            {!r.found ? <span className="text-xs text-rose-600">not found</span> : null}
                          </span>
                          <Members words={r.members} />
                          {r.definition ? (
                            <span className="font-bengali block text-xs text-slate-500">{r.definition}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* workflow history — self-start keeps it content-sized rather than matching the left column */}
        <Card className="self-start lg:col-span-2">
          <CardHeader
            title="Workflow history"
            subtitle={`${sub.history.length} state change${sub.history.length === 1 ? "" : "s"} · newest first · immutable audit trail`}
          />
          <ol className="px-5 py-4">
            {history.map((h, i) => (
              <li key={i} className="relative pb-5 pl-6 last:pb-0">
                {i < history.length - 1 ? (
                  <span className="absolute top-3 left-[7px] h-full w-px bg-slate-200" />
                ) : null}
                <span
                  className={`absolute top-1.5 left-0 h-3.5 w-3.5 rounded-full ring-2 ring-white ${
                    h.to === "VALIDATED"
                      ? "bg-emerald-500"
                      : h.to === "REJECTED"
                        ? "bg-rose-500"
                        : h.to === "ARBITRATION"
                          ? "bg-purple-500"
                          : i === 0
                            ? "bg-slate-700"
                            : "bg-slate-300"
                  }`}
                />
                <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-700">
                  {h.from ? (
                    <>
                      <StateBadge state={h.from} />
                      <span className="text-slate-400">→</span>
                    </>
                  ) : (
                    <span className="text-slate-400">Created as</span>
                  )}
                  <StateBadge state={h.to} />
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {h.actorId === "system"
                    ? "System (automatic)"
                    : `${h.actorName ?? nameOf(h.actorId)} · ${
                        h.actorRole === "SYSTEM"
                          ? "system"
                          : (ROLE_LABEL[h.actorRole as Role] ?? h.actorRole)
                      }`}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatDateTime(h.timestamp)}
                  {h.secondsInPreviousState != null && h.from
                    ? ` · after ${formatDuration(h.secondsInPreviousState)} in ${stateLabel(h.from)}`
                    : ""}
                </p>
                {h.comment ? (
                  <p className="font-bengali mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                    {h.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {showReview && sub.review ? (
        <Card className="mt-6">
          <CardHeader
            title="Review decision"
            subtitle={`As ${ROLE_LABEL[session.role]} · entry is ${stateLabel(sub.state)}`}
          />
          <div className="p-5">
            <ReviewDecisionPanel submissionId={sub.id} version={sub.version} options={sub.review} />
          </div>
        </Card>
      ) : null}

      {!activeCase && ownerActions.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Available actions"
            subtitle={`Your entry is ${stateLabel(sub.state)}`}
          />
          <div className="p-5">
            <OwnerActionsPanel submissionId={sub.id} version={sub.version} actions={ownerActions} />
          </div>
        </Card>
      ) : null}

      {/* Platform Architect / System Moderator: drafts belong to their owner, so nothing is offered there. */}
      {isManager && sub.state !== "DRAFT" && sub.lifecycle ? (
        <ManagerActionsPanel
          submissionId={sub.id}
          version={sub.version}
          state={sub.state}
          lifecycle={sub.lifecycle}
          reviewers={sub.reviewers ?? []}
          assignedEditor={sub.assignedTo ?? null}
          assignedChief={sub.assignedChief ?? null}
        />
      ) : null}

      {!isManager && actions.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Available actions"
            subtitle={`Permitted for your role (${ROLE_LABEL[session.role]}) in state ${sub.state}`}
          />
          <div className="p-5">
            <ReviewActions submissionId={sub.id} actions={actions} />
          </div>
        </Card>
      ) : null}

      {!isManager && isFinal ? <FinalStatusNotice state={sub.state} /> : null}
    </div>
  );
}
