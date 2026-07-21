import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store, userById } from "@/lib/store";
import { synsetById } from "@/lib/lexicon";
import { formatDateTime, REL_LABEL, ROLE_LABEL } from "@/lib/format";
import {
  Card,
  CardHeader,
  IdChip,
  LangBadge,
  PageTitle,
  PosBadge,
  StateBadge,
} from "@/components/ui";
import {
  ReviewActions,
  type ActionSpec,
} from "@/components/dashboard/ReviewActions";
import type { Session, Submission } from "@/lib/types";

export const metadata: Metadata = { title: "Submission" };

/** Compute the actions available to this user for this submission (SRS §5.2). */
function actionsFor(session: Session, sub: Submission): ActionSpec[] {
  const role = session.role;
  const isOwner = sub.contributorId === session.userId;
  const actions: ActionSpec[] = [];

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
  if (isOwner) {
    if (sub.state === "DRAFT") {
      actions.push(
        { action: "submit_draft", label: "Submit for Review", tone: "green" },
        { action: "delete_draft", label: "Delete Draft", tone: "red", confirm: "Delete this draft permanently?" }
      );
    }
    if (["FLAGGED", "C_FLAGGED"].includes(sub.state)) {
      actions.push({
        action: "resubmit",
        label: "↻ Resubmit after Correction",
        tone: "green",
        needsComment: false,
      });
    }
    if (
      ["REJECTED", "FLAGGED", "C_FLAGGED"].includes(sub.state) &&
      hasPermission(role, "dispute")
    ) {
      actions.push({
        action: "dispute",
        label: "⚖ Dispute to Arbitration Panel",
        tone: "purple",
        needsComment: true,
        minComment: 30,
        commentLabel: "A dispute note",
      });
    }
  }
  if (sub.state === "UNDER_REVIEW" && hasPermission(role, "override_state")) {
    actions.push({
      action: "clear_under_review",
      label: "🧹 Clear Anti-Bot Hold",
      tone: "green",
    });
  }
  if (hasPermission(role, "override_state")) {
    actions.push({
      action: "override",
      label: "⚠ Emergency Override",
      tone: "slate",
      needsComment: true,
      minComment: 1,
      commentLabel: "An override reason",
      needsTargetState: true,
      confirm: "Emergency state overrides are permanently logged in the audit trail. Continue?",
    });
  }
  return actions;
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const sub = store.submissions.find((s) => s.id === id);
  if (!sub) notFound();

  const isOwner = sub.contributorId === session.userId;
  const canSeeOthers =
    hasPermission(session.role, "view_pending_queue") ||
    hasPermission(session.role, "view_editor_approved_queue") ||
    session.role === "ARBITRATION_CURATOR";
  if (!isOwner && !canSeeOthers) redirect("/dashboard");

  const synset = sub.synsetId ? synsetById.get(sub.synsetId) : undefined;
  const relatedCase = store.cases.find((c) => c.submissionId === sub.id);
  const actions = actionsFor(session, sub);
  const reviewers = hasPermission(session.role, "assign_entries")
    ? store.users
        .filter((u) => ["LEXICAL_EDITOR", "CHIEF_LEXICAL_EDITOR"].includes(u.role))
        .map((u) => ({ id: u.id, name: `${u.name} (${ROLE_LABEL[u.role]})` }))
    : undefined;

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
            {userById(sub.contributorId)?.name} ·{" "}
            {formatDateTime(sub.createdAt)}
            {sub.assignedTo
              ? ` · assigned to ${userById(sub.assignedTo)?.name}`
              : ""}
          </span>
        }
      />

      {/* reviewer feedback banners */}
      {sub.state === "FLAGGED" && sub.editorComment ? (
        <div className="font-bengali mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Lexical Editor comment:</strong> {sub.editorComment}
        </div>
      ) : null}
      {sub.state === "C_FLAGGED" && sub.cleComment ? (
        <div className="font-bengali mb-5 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-900">
          <strong>Chief Lexical Editor note:</strong> {sub.cleComment}
          <span className="mt-1 block text-xs text-fuchsia-600">
            Both the Lexical Editor and the Contributor were notified
            simultaneously (SRS §7.5.1).
          </span>
        </div>
      ) : null}
      {sub.state === "REJECTED" && sub.rejectionReason ? (
        <div className="font-bengali mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <strong>Rejection reason:</strong> {sub.rejectionReason}
        </div>
      ) : null}
      {relatedCase ? (
        <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
          ⚖ This entry is linked to arbitration case{" "}
          <Link
            href={`/dashboard/arbitration/${relatedCase.id}`}
            className="font-bold underline"
          >
            {relatedCase.id}
          </Link>{" "}
          ({relatedCase.status.replaceAll("_", " ").toLowerCase()}).
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* payload */}
        <Card className="lg:col-span-3">
          <CardHeader title="Proposed lexical record" subtitle="Quick Input payload" />
          <dl className="divide-y divide-slate-50 text-sm">
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-5">
              <dt className="text-slate-400">Written form</dt>
              <dd className="font-bengali col-span-2 text-lg font-bold text-slate-900">
                {sub.writtenForm}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-5">
              <dt className="text-slate-400">Part of speech</dt>
              <dd className="col-span-2">
                <PosBadge pos={sub.pos} />
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-5">
              <dt className="text-slate-400">Synset linkage</dt>
              <dd className="col-span-2">
                {sub.synsetAction === "link" ? (
                  <span className="flex flex-wrap items-center gap-2">
                    Link to existing{" "}
                    {sub.synsetId ? (
                      <Link href={`/synset/${sub.synsetId}`}>
                        <IdChip id={sub.synsetId} />
                      </Link>
                    ) : null}
                    {synset ? (
                      <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                        ILI {synset.ili}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="flex flex-wrap items-center gap-2">
                    Create new concept
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                      ILI {sub.iliCode}
                    </span>
                  </span>
                )}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-5">
              <dt className="text-slate-400">Definition</dt>
              <dd className="col-span-2">
                {sub.definitionText ? (
                  <span className="font-bengali">
                    <LangBadge lang={sub.definitionLanguage ?? "ben"} />{" "}
                    {sub.definitionText}
                  </span>
                ) : synset?.definition ? (
                  <span className="font-bengali text-slate-500">
                    <LangBadge lang={synset.definition.language} />{" "}
                    {synset.definition.text}{" "}
                    <em className="text-xs">(inherited from synset)</em>
                  </span>
                ) : (
                  <em className="text-slate-400">none provided</em>
                )}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-5">
              <dt className="text-slate-400">Sense relations</dt>
              <dd className="col-span-2 space-y-1">
                {sub.senseRelations.length === 0 ? (
                  <em className="text-slate-400">none</em>
                ) : (
                  sub.senseRelations.map((r, i) => (
                    <span key={i} className="flex items-center gap-2 text-xs">
                      <span className="rounded bg-slate-50 px-1.5 py-0.5 ring-1 ring-inset ring-slate-200">
                        {REL_LABEL[r.relType] ?? r.relType}
                      </span>
                      <IdChip id={r.target} />
                    </span>
                  ))
                )}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-5">
              <dt className="text-slate-400">Synset relations</dt>
              <dd className="col-span-2 space-y-1">
                {sub.synsetRelations.length === 0 ? (
                  <em className="text-slate-400">none</em>
                ) : (
                  sub.synsetRelations.map((r, i) => (
                    <span key={i} className="flex items-center gap-2 text-xs">
                      <span className="rounded bg-slate-50 px-1.5 py-0.5 ring-1 ring-inset ring-slate-200">
                        {REL_LABEL[r.relType] ?? r.relType}
                      </span>
                      <Link href={`/synset/${r.target}`}>
                        <IdChip id={r.target} />
                      </Link>
                    </span>
                  ))
                )}
              </dd>
            </div>
            {sub.reviewerNote ? (
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-5">
                <dt className="text-slate-400">Contributor note</dt>
                <dd className="font-bengali col-span-2 text-slate-600">
                  {sub.reviewerNote}
                </dd>
              </div>
            ) : null}
            {sub.validatedBy ? (
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-5">
                <dt className="text-slate-400">Validated by</dt>
                <dd className="col-span-2 font-semibold text-emerald-700">
                  {userById(sub.validatedBy)?.name} ·{" "}
                  {sub.validatedAt ? formatDateTime(sub.validatedAt) : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        {/* history timeline */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Lifecycle history"
            subtitle="Immutable audit timeline (SRS §5.3)"
          />
          <ol className="space-y-0 px-5 py-4">
            {[...sub.history].reverse().map((h, i) => (
              <li key={i} className="relative pb-5 pl-6 last:pb-0">
                {i < sub.history.length - 1 ? (
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
                          : "bg-slate-300"
                  }`}
                />
                <p className="text-xs font-bold text-slate-700">
                  {h.from ? `${h.from} → ` : ""}
                  {h.to}
                </p>
                <p className="text-[11px] text-slate-400">
                  {h.actorId === "system"
                    ? "System (automatic)"
                    : `${userById(h.actorId)?.name ?? h.actorId} · ${h.actorRole === "SYSTEM" ? "system" : ROLE_LABEL[h.actorRole as keyof typeof ROLE_LABEL]}`}{" "}
                  · {formatDateTime(h.timestamp)}
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

      {/* actions */}
      {actions.length > 0 || reviewers ? (
        <Card className="mt-6">
          <CardHeader
            title="Available actions"
            subtitle={`Permitted for your role (${ROLE_LABEL[session.role]}) in state ${sub.state}`}
          />
          <div className="p-5">
            <ReviewActions
              submissionId={sub.id}
              actions={actions}
              reviewers={reviewers}
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
