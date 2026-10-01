"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
import { z } from "zod";
import { STATE_LABEL } from "@/lib/format";
import type { EntryState } from "@/lib/types";
import { Card, CardHeader, StateBadge } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export type Lifecycle = {
  final: boolean;
  finalReason?: string;
  forwardOverrideTargets?: EntryState[];
  overrideTargets?: EntryState[];
  overrideReasonMin?: number;
  overrideReasonMax?: number;
  assignable?: boolean;
};

type Reviewer = { id: string; name: string; role: string };

type ApiResult = {
  state?: EntryState;
  previousState?: EntryState;
  caseId?: string;
  closedCases?: string[];
  changes?: string[];
  error?: string;
  errors?: Record<string, string>;
};

function without(errors: Record<string, string>, key: string): Record<string, string> {
  if (!(key in errors)) return errors;
  const next = { ...errors };
  delete next[key];
  return next;
}

function reasonSchema(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, "An override reason is required.")
    .min(min, `The override reason must be at least ${min} characters.`)
    .max(max, `The override reason must be at most ${max} characters.`);
}

const TARGET_EFFECT: Partial<Record<EntryState, string>> = {
  EDITOR_APPROVED:
    "Skips the Lexical Editor review. The entry moves to the Chief Lexical Editor's queue for final review.",
  VALIDATED:
    "Validates the entry immediately and adds it to the lexicon (search, linking and XML export). Validation is final.",
  REJECTED:
    "Closes the entry as rejected. Your reason is shown to the contributor as the rejection reason. Rejection is final.",
  ARBITRATION:
    "Opens an arbitration case with your reason as the case note. The contributor has 72 hours to respond, then the curator panel votes.",
};

export function FinalStatusNotice({ state }: { state: EntryState }) {
  const validated = state === "VALIDATED";
  return (
    <Card className="mt-6">
      <CardHeader title="Status is final" subtitle="No further actions are available" />
      <div className={`flex items-start gap-3 p-5 text-sm ${validated ? "text-emerald-900" : "text-red-900"}`}>
        <span aria-hidden="true" className="text-lg leading-none">
          🔒
        </span>
        <p>
          {validated ? (
            <>
              This entry is <strong>Validated</strong> and part of the lexicon. Validation is final: its status
              cannot be changed, overridden or reassigned, and the entry cannot be edited or withdrawn.
            </>
          ) : (
            <>
              This entry is <strong>Rejected</strong>. Rejection is final: its status cannot be changed,
              overridden or reassigned, and the entry cannot be edited or resubmitted.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}

/**
 * Platform Architect / System Moderator controls on someone's entry: forward-only emergency override,
 * anti-bot hold release and the optional Lexical Editor + Chief Lexical Editor assignment.
 */
export function ManagerActionsPanel({
  submissionId,
  version,
  state,
  lifecycle,
  reviewers,
  assignedEditor,
  assignedChief,
}: {
  submissionId: string;
  version?: number | null;
  state: EntryState;
  lifecycle: Lifecycle;
  reviewers: Reviewer[];
  assignedEditor?: string | null;
  assignedChief?: string | null;
}) {
  const router = useRouter();
  const reasonId = useId();
  const targetId = useId();
  const editorSelectId = useId();
  const chiefSelectId = useId();

  const reasonMin = lifecycle.overrideReasonMin ?? 15;
  const reasonMax = lifecycle.overrideReasonMax ?? 1000;
  const targets = lifecycle.forwardOverrideTargets ?? [];
  const editors = reviewers.filter((r) => r.role === "LEXICAL_EDITOR");
  const chiefs = reviewers.filter((r) => r.role === "CHIEF_LEXICAL_EDITOR");

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"override" | "clear" | "assign" | null>(null);
  const [confirming, setConfirming] = useState<"override" | "clear" | null>(null);
  const closeConfirm = useCallback(() => setConfirming(null), []);

  const [target, setTarget] = useState<EntryState | "">("");
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [targetTouched, setTargetTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const [editorId, setEditorId] = useState(assignedEditor ?? "");
  const [chiefId, setChiefId] = useState(assignedChief ?? "");
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});

  const reasonCheck = useMemo(() => reasonSchema(reasonMin, reasonMax).safeParse(reason), [reason, reasonMin, reasonMax]);
  const reasonError =
    serverErrors.comment ??
    ((reasonTouched || reason.length > 0) && !reasonCheck.success ? reasonCheck.error.issues[0]?.message : null);
  const targetError =
    serverErrors.targetState ?? ((targetTouched || reason.length > 0) && !target ? "Select the new status." : null);
  const reasonLength = reason.trim().length;
  const overrideReady = Boolean(target) && reasonCheck.success && busy === null;

  const assignChanged = editorId !== (assignedEditor ?? "") || chiefId !== (assignedChief ?? "");
  const nameOf = (id: string | null | undefined) => reviewers.find((r) => r.id === id)?.name ?? null;

  async function post(body: Record<string, unknown>): Promise<{ res: Response; data: ApiResult }> {
    const res = await fetch(`/api/submissions/${encodeURIComponent(submissionId)}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, expectedVersion: version ?? undefined }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult;
    return { res, data };
  }

  function startOverride() {
    setTargetTouched(true);
    setReasonTouched(true);
    setSuccess(null);
    setError(null);
    if (!target || !reasonCheck.success) return;
    setConfirming("override");
  }

  async function runOverride() {
    if (!target) return;
    setBusy("override");
    setError(null);
    setServerErrors({});
    try {
      const { res, data } = await post({ action: "override", targetState: target, comment: reason.trim() });
      if (!res.ok) {
        if (data.errors && (data.errors.comment || data.errors.targetState)) {
          setServerErrors(data.errors);
        } else {
          setError(data.error ?? Object.values(data.errors ?? {})[0] ?? "The override could not be applied.");
        }
        if (res.status === 409) router.refresh();
        return;
      }
      const to = data.state ?? target;
      const extra =
        to === "VALIDATED"
          ? " The entry is now part of the lexicon."
          : data.caseId
            ? ` Arbitration case ${data.caseId} was opened.`
            : "";
      const closed = data.closedCases?.length ? ` Arbitration case ${data.closedCases.join(", ")} was closed.` : "";
      setSuccess(
        `Emergency override applied: ${STATE_LABEL[state]} → ${STATE_LABEL[to] ?? to}.${extra}${closed}`
      );
      setTarget("");
      setReason("");
      setReasonTouched(false);
      setTargetTouched(false);
      router.refresh();
    } catch {
      setError("Network error — nothing was changed. Please try again.");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  async function runClearHold() {
    setBusy("clear");
    setError(null);
    setSuccess(null);
    try {
      const { res, data } = await post({ action: "clear_under_review" });
      if (!res.ok) {
        setError(data.error ?? Object.values(data.errors ?? {})[0] ?? "The hold could not be cleared.");
        if (res.status === 409) router.refresh();
        return;
      }
      setSuccess("Anti-bot hold cleared. The entry is now Pending Review in the Lexical Editor's queue.");
      router.refresh();
    } catch {
      setError("Network error — nothing was changed. Please try again.");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  async function saveAssignment() {
    setBusy("assign");
    setError(null);
    setSuccess(null);
    setAssignErrors({});
    try {
      const body: Record<string, unknown> = { action: "assign" };
      if (editorId !== (assignedEditor ?? "")) body.editorId = editorId;
      if (chiefId !== (assignedChief ?? "")) body.chiefId = chiefId;
      const { res, data } = await post(body);
      if (!res.ok) {
        if (data.errors && (data.errors.editorId || data.errors.chiefId)) {
          setAssignErrors(data.errors);
        } else {
          setError(data.error ?? Object.values(data.errors ?? {})[0] ?? "The assignment could not be saved.");
        }
        if (res.status === 409) router.refresh();
        return;
      }
      setSuccess(`Assignment saved: ${(data.changes ?? []).join("; ")}.`);
      router.refresh();
    } catch {
      setError("Network error — the assignment was not saved. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (lifecycle.final) {
    return (
      <>
        {success ? (
          <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
            ✓ {success}
          </p>
        ) : null}
        <FinalStatusNotice state={state} />
      </>
    );
  }

  const showOverride = targets.length > 0;
  const showClear = state === "UNDER_REVIEW";
  const showAssign = Boolean(lifecycle.assignable);
  if (!showOverride && !showClear && !showAssign && !success) return null;

  const targetLabel = target ? (STATE_LABEL[target] ?? target) : "";
  const danger = target === "REJECTED";

  return (
    <Card className="mt-6">
      <CardHeader title="Available actions" subtitle={`Entry is ${STATE_LABEL[state] ?? state}`} />
      <div className="divide-y divide-slate-100">
        {success || error ? (
          <div className="space-y-2 p-5">
            {success ? (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                ✓ {success}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {showClear ? (
          <section className="space-y-3 p-5">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Anti-bot hold</h4>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                This entry was held for a security check. If it looks genuine, release it to the Lexical Editor&apos;s
                review queue.
              </p>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setSuccess(null);
                setError(null);
                setConfirming("clear");
              }}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {busy === "clear" ? "Releasing…" : "🧹 Clear hold → Pending Review"}
            </button>
          </section>
        ) : null}

        {showOverride ? (
          <section className="space-y-4 p-5">
            <div>
              <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
                ⚠ Emergency override
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                  Forward only
                </span>
              </h4>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Moves the entry forward without the normal review step. Every override is permanently recorded in the
                workflow history and the audit trail with your reason.
              </p>
            </div>

            <div>
              <label htmlFor={targetId} className="mb-1.5 block text-xs font-bold text-slate-600">
                New status <span className="text-red-500">*</span>
              </label>
              <select
                id={targetId}
                value={target}
                disabled={busy !== null}
                onChange={(e) => {
                  setTarget(e.target.value as EntryState | "");
                  setTargetTouched(true);
                  setServerErrors((s) => without(s, "targetState"));
                }}
                aria-invalid={Boolean(targetError)}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 sm:w-72 ${
                  targetError
                    ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
                }`}
              >
                <option value="">Select the new status…</option>
                {targets.map((s) => (
                  <option key={s} value={s}>
                    {STATE_LABEL[s] ?? s}
                  </option>
                ))}
              </select>
              {targetError ? (
                <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                  ⚠ {targetError}
                </p>
              ) : null}
              {target ? (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 ring-1 ring-inset ring-slate-200">
                  {TARGET_EFFECT[target]}
                  {state === "ARBITRATION"
                    ? " The open arbitration case is closed and curators can no longer vote on it."
                    : ""}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor={reasonId} className="mb-1.5 block text-xs font-bold text-slate-600">
                Override reason <span className="text-red-500">*</span>{" "}
                <span className="font-normal text-slate-400">
                  ({reasonMin}–{reasonMax} characters)
                </span>
              </label>
              <textarea
                id={reasonId}
                value={reason}
                rows={4}
                maxLength={reasonMax + 200}
                disabled={busy !== null}
                onChange={(e) => {
                  setReason(e.target.value);
                  setServerErrors((s) => without(s, "comment"));
                }}
                onBlur={() => setReasonTouched(true)}
                aria-invalid={Boolean(reasonError)}
                aria-describedby={`${reasonId}-hint`}
                placeholder="Explain why this entry needs an emergency override…"
                className={`font-bengali w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  reasonError
                    ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
                }`}
              />
              <div id={`${reasonId}-hint`} className="mt-1 flex items-start justify-between gap-3 text-xs">
                {reasonError ? (
                  <p role="alert" className="font-medium text-red-600">
                    ⚠ {reasonError}
                  </p>
                ) : (
                  <p className="text-slate-400">Recorded in the history and shown with the status change.</p>
                )}
                <span
                  className={`shrink-0 tabular-nums ${
                    reasonLength > reasonMax || ((reasonTouched || reason.length > 0) && reasonLength < reasonMin)
                      ? "font-semibold text-red-600"
                      : "text-slate-400"
                  }`}
                >
                  {reasonLength} / {reasonMax}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!overrideReady}
              onClick={startOverride}
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "override" ? "Applying…" : "⚠ Apply emergency override"}
            </button>
          </section>
        ) : null}

        {showAssign ? (
          <section className="space-y-4 p-5">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Assign reviewers</h4>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Optional. When set, only the assigned Lexical Editor can review this entry at Pending Review, and only
                the assigned Chief Lexical Editor at Editor Approved. Leave a slot unassigned to let anyone in that
                role review it.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={editorSelectId} className="mb-1.5 block text-xs font-bold text-slate-600">
                  Lexical Editor
                </label>
                <select
                  id={editorSelectId}
                  value={editorId}
                  disabled={busy !== null}
                  onChange={(e) => {
                    setEditorId(e.target.value);
                    setAssignErrors((s) => without(s, "editorId"));
                  }}
                  aria-invalid={Boolean(assignErrors.editorId)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                    assignErrors.editorId
                      ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-200"
                      : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                >
                  <option value="">Unassigned — any Lexical Editor</option>
                  {editors.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {assignErrors.editorId ? (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                    ⚠ {assignErrors.editorId}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    Currently: {nameOf(assignedEditor) ?? "unassigned"}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={chiefSelectId} className="mb-1.5 block text-xs font-bold text-slate-600">
                  Chief Lexical Editor
                </label>
                <select
                  id={chiefSelectId}
                  value={chiefId}
                  disabled={busy !== null}
                  onChange={(e) => {
                    setChiefId(e.target.value);
                    setAssignErrors((s) => without(s, "chiefId"));
                  }}
                  aria-invalid={Boolean(assignErrors.chiefId)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                    assignErrors.chiefId
                      ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-200"
                      : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                >
                  <option value="">Unassigned — any Chief Lexical Editor</option>
                  {chiefs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {assignErrors.chiefId ? (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                    ⚠ {assignErrors.chiefId}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    Currently: {nameOf(assignedChief) ?? "unassigned"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!assignChanged || busy !== null}
                onClick={saveAssignment}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "assign" ? "Saving…" : "Save assignment"}
              </button>
              {assignChanged ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    setEditorId(assignedEditor ?? "");
                    setChiefId(assignedChief ?? "");
                    setAssignErrors({});
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Discard changes
                </button>
              ) : (
                <span className="text-xs text-slate-400">No unsaved changes.</span>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <ConfirmModal
        open={confirming === "override"}
        title="Apply emergency override?"
        description={
          <>
            The entry moves from <strong>{STATE_LABEL[state]}</strong> to <strong>{targetLabel}</strong> without the
            normal review step. This is permanently recorded in the workflow history and the audit trail.
          </>
        }
        confirmLabel={`Yes, move to ${targetLabel}`}
        tone={danger ? "danger" : "warning"}
        busy={busy === "override"}
        onConfirm={runOverride}
        onCancel={closeConfirm}
      >
        <div className="space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <StateBadge state={state} />
            <span className="text-slate-400">→</span>
            {target ? <StateBadge state={target} /> : null}
          </p>
          {target ? (
            <p
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                target === "VALIDATED" || target === "REJECTED"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {target === "VALIDATED" || target === "REJECTED" ? "🔒 " : "⚠ "}
              {TARGET_EFFECT[target]}
              {state === "ARBITRATION" ? " The open arbitration case is closed." : ""}
            </p>
          ) : null}
          <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Reason</p>
            <p className="font-bengali mt-0.5 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-sm text-slate-700">
              {reason.trim()}
            </p>
          </div>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={confirming === "clear"}
        title="Release the anti-bot hold?"
        description="The entry passed your manual check. Its status changes to Pending Review and it goes to the Lexical Editor's review queue."
        confirmLabel="Yes, release to review"
        tone="primary"
        busy={busy === "clear"}
        onConfirm={runClearHold}
        onCancel={closeConfirm}
      >
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <StateBadge state="UNDER_REVIEW" />
          <span className="text-slate-400">→</span>
          <StateBadge state="PENDING_REVIEW" />
        </p>
      </ConfirmModal>
    </Card>
  );
}
