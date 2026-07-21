"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EntryState } from "@/lib/types";

export interface ActionSpec {
  action: string;
  label: string;
  tone: "green" | "amber" | "red" | "purple" | "slate" | "fuchsia";
  needsComment?: boolean;
  minComment?: number;
  commentLabel?: string;
  needsTargetState?: boolean;
  confirm?: string;
}

const TONE: Record<ActionSpec["tone"], string> = {
  green: "bg-emerald-700 hover:bg-emerald-800 text-white",
  amber: "bg-amber-600 hover:bg-amber-700 text-white",
  red: "bg-rose-600 hover:bg-rose-700 text-white",
  purple: "bg-purple-700 hover:bg-purple-800 text-white",
  fuchsia: "bg-fuchsia-700 hover:bg-fuchsia-800 text-white",
  slate: "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700",
};

const ALL_STATES: EntryState[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "UNDER_REVIEW",
  "FLAGGED",
  "C_FLAGGED",
  "EDITOR_APPROVED",
  "ARBITRATION",
  "VALIDATED",
  "REJECTED",
];

export function ReviewActions({
  submissionId,
  actions,
  reviewers,
}: {
  submissionId: string;
  actions: ActionSpec[];
  reviewers?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [active, setActive] = useState<ActionSpec | null>(null);
  const [comment, setComment] = useState("");
  const [targetState, setTargetState] = useState<EntryState>("PENDING_REVIEW");
  const [assignTo, setAssignTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (actions.length === 0 && !reviewers) return null;

  async function run(spec: ActionSpec) {
    if (spec.needsComment && comment.trim().length < (spec.minComment ?? 1)) {
      setActive(spec);
      setError(
        `${spec.commentLabel ?? "A comment"} of at least ${spec.minComment ?? 1} characters is required.`
      );
      return;
    }
    if (spec.confirm && !window.confirm(spec.confirm)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: spec.action,
          comment: comment.trim() || undefined,
          targetState: spec.needsTargetState ? targetState : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed.");
        return;
      }
      setComment("");
      setActive(null);
      if (spec.action === "delete_draft") {
        router.push("/dashboard/submissions");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function assign() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", assignTo: assignTo || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Assignment failed.");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const needsInput = actions.some((a) => a.needsComment || a.needsTargetState);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      {needsInput ? (
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Comment / reason{" "}
            {active?.needsComment
              ? `(min ${active.minComment ?? 1} chars for “${active.label}”)`
              : ""}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Required for flag / reject / C-flag / escalate / dispute / override…"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      ) : null}

      {actions.some((a) => a.needsTargetState) ? (
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Override target state:
          </label>
          <select
            value={targetState}
            onChange={(e) => setTargetState(e.target.value as EntryState)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {ALL_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        {actions.map((spec) => (
          <button
            key={spec.action + spec.label}
            disabled={busy}
            onClick={() => run(spec)}
            onMouseEnter={() => setActive(spec)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-50 ${TONE[spec.tone]}`}
          >
            {spec.label}
          </button>
        ))}
      </div>

      {reviewers ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Assign to reviewer:
          </label>
          <select
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">(unassigned)</option>
            {reviewers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            disabled={busy}
            onClick={assign}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-900 disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      ) : null}
    </div>
  );
}
