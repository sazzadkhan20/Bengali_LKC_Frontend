"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { STATE_LABEL } from "@/lib/format";
import type { EntryState } from "@/lib/types";
import { StateBadge } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export type OwnerActionName = "SUBMIT_DRAFT" | "DELETE_DRAFT" | "RESUBMIT" | "DISPUTE";

export type OwnerAction = {
  action: OwnerActionName;
  label: string;
  toState: EntryState | null;
  noteMin?: number;
  noteMax?: number;
};

export type OwnerActions = {
  actions: OwnerAction[];
  activeCase?: { id: string; status: string };
};

function disputeNoteSchema(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, "A dispute note is required.")
    .min(min, `Dispute note must be at least ${min} characters.`)
    .max(max, `Dispute note must be at most ${max} characters.`);
}

type ApiResult = {
  state?: EntryState;
  caseId?: string;
  error?: string;
  errors?: Record<string, string>;
};

export function OwnerActionsPanel({
  submissionId,
  version,
  actions,
}: {
  submissionId: string;
  version?: number | null;
  actions: OwnerAction[];
}) {
  const router = useRouter();
  const noteId = useId();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState<OwnerActionName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  const [serverNoteError, setServerNoteError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"SUBMIT_DRAFT" | "DELETE_DRAFT" | null>(null);
  const closeConfirm = useCallback(() => setConfirming(null), []);

  const dispute = actions.find((a) => a.action === "DISPUTE");
  const noteMin = dispute?.noteMin ?? 15;
  const noteMax = dispute?.noteMax ?? 1000;
  const noteLength = note.trim().length;

  const noteError = useMemo(() => {
    if (serverNoteError) return serverNoteError;
    if (!noteTouched) return null;
    const check = disputeNoteSchema(noteMin, noteMax).safeParse(note);
    return check.success ? null : (check.error.issues[0]?.message ?? "Invalid dispute note.");
  }, [note, noteTouched, noteMin, noteMax, serverNoteError]);

  async function post(path: string, body: Record<string, unknown>): Promise<{ res: Response; data: ApiResult }> {
    const res = await fetch(`/api/submissions/${encodeURIComponent(submissionId)}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult;
    return { res, data };
  }

  function failure(res: Response, data: ApiResult, fallback: string) {
    setError(data.error ?? Object.values(data.errors ?? {})[0] ?? fallback);
    if (res.status === 409) router.refresh();
  }

  async function runDraftAction(action: "SUBMIT_DRAFT" | "DELETE_DRAFT") {
    setBusy(action);
    setError(null);
    setSuccess(null);
    try {
      const { res, data } = await post("action", {
        action: action === "SUBMIT_DRAFT" ? "submit_draft" : "delete_draft",
      });
      if (!res.ok) {
        failure(res, data, "The action could not be completed. Please try again.");
        return;
      }
      if (action === "DELETE_DRAFT") {
        router.replace("/dashboard/submissions");
        router.refresh();
        return;
      }
      setSuccess(
        data.state === "VALIDATED"
          ? "Status changed to Validated. The entry is now part of the lexicon and its status is final."
          : `Status changed to ${STATE_LABEL[data.state ?? "PENDING_REVIEW"] ?? data.state}.`
      );
      router.refresh();
    } catch {
      setError("Network error — nothing was changed. Please try again.");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  const submitDraft = actions.find((a) => a.action === "SUBMIT_DRAFT");
  const draftValidates = submitDraft?.toState === "VALIDATED";
  const confirmCopy =
    confirming === "DELETE_DRAFT"
      ? {
          title: "Delete this draft?",
          description: "The draft is deleted permanently. This cannot be undone.",
          confirmLabel: "Delete draft",
          tone: "danger" as const,
        }
      : draftValidates
        ? {
            title: "Submit and validate directly?",
            description:
              "As a Platform Architect or System Moderator, your entry skips the Lexical Editor and Chief Lexical Editor review. Its status changes to Validated immediately and it is added to the lexicon with permanent IDs (included in search, linking and XML export).",
            confirmLabel: "Yes, validate now",
            tone: "primary" as const,
          }
        : {
            title: "Submit this draft for review?",
            description:
              "The entry is checked again and, if it passes, its status changes to Pending Review and it goes to the Lexical Editor's review queue.",
            confirmLabel: "Yes, submit for review",
            tone: "primary" as const,
          };

  async function submitDispute() {
    setNoteTouched(true);
    setServerNoteError(null);
    setError(null);
    setSuccess(null);
    const parsed = disputeNoteSchema(noteMin, noteMax).safeParse(note);
    if (!parsed.success) {
      noteRef.current?.focus();
      return;
    }
    setBusy("DISPUTE");
    try {
      const { res, data } = await post("dispute", {
        note: parsed.data,
        expectedVersion: version ?? undefined,
      });
      if (!res.ok) {
        if (data.errors?.note) {
          setServerNoteError(data.errors.note);
          noteRef.current?.focus();
        } else {
          failure(res, data, "The dispute could not be opened. Please try again.");
        }
        return;
      }
      setSuccess(
        `Dispute submitted. Status changed to ${STATE_LABEL[data.state ?? "ARBITRATION"] ?? data.state}${
          data.caseId ? ` — arbitration case ${data.caseId} opened` : ""
        }.`
      );
      setNote("");
      setNoteTouched(false);
      setDisputeOpen(false);
      router.refresh();
    } catch {
      setError("Network error — the dispute was not submitted. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const describedBy = noteError ? `${noteId}-error` : `${noteId}-hint`;

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={confirming !== null}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        tone={confirmCopy.tone}
        busy={busy !== null}
        onConfirm={() => confirming && runDraftAction(confirming)}
        onCancel={closeConfirm}
      >
        {confirming === "SUBMIT_DRAFT" && draftValidates ? (
          <div className="mb-3 space-y-2">
            <p className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-800">
              ⚡ Direct validation — no review step follows this confirmation.
            </p>
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              🔒 Validation is final. Once validated, the status cannot be changed or overridden, and the
              entry cannot be edited or withdrawn.
            </p>
          </div>
        ) : null}
        {confirming === "SUBMIT_DRAFT" && submitDraft?.toState ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            New status: <StateBadge state={submitDraft.toState} />
          </p>
        ) : null}
      </ConfirmModal>
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      {!disputeOpen ? (
      <div className="flex flex-wrap gap-2.5">
        {actions.map((a) => {
          const hint = a.toState ? `Moves the entry to ${STATE_LABEL[a.toState] ?? a.toState}` : undefined;
          switch (a.action) {
            case "SUBMIT_DRAFT":
              return (
                <button
                  key={a.action}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setConfirming("SUBMIT_DRAFT")}
                  title={hint}
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {busy === a.action
                    ? "Submitting…"
                    : draftValidates
                      ? "⚡ Submit & Validate"
                      : `✓ ${a.label}`}
                </button>
              );
            case "DELETE_DRAFT":
              return (
                <button
                  key={a.action}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setConfirming("DELETE_DRAFT")}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                >
                  {busy === a.action ? "Deleting…" : `✕ ${a.label}`}
                </button>
              );
            case "RESUBMIT":
              return (
                <Link
                  key={a.action}
                  href={`/dashboard/quick-input?resubmit=${encodeURIComponent(submissionId)}`}
                  title={`Edit the entry in Quick Input. ${hint ?? ""}`.trim()}
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  ↻ {a.label}
                </Link>
              );
            case "DISPUTE":
              return (
                <button
                  key={a.action}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    setDisputeOpen(true);
                    setError(null);
                    setSuccess(null);
                    setTimeout(() => noteRef.current?.focus(), 0);
                  }}
                  className="rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-800 disabled:opacity-50"
                >
                  ⚖ {a.label}
                </button>
              );
          }
        })}
      </div>
      ) : null}

      {dispute && disputeOpen ? (
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
          <label
            htmlFor={noteId}
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Dispute note
            <span className="ml-1 normal-case text-slate-500">
              — required ({noteMin}–{noteMax} characters)
            </span>
          </label>
          <textarea
            id={noteId}
            ref={noteRef}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteTouched(true);
              setServerNoteError(null);
            }}
            rows={4}
            aria-invalid={noteError ? true : undefined}
            aria-describedby={describedBy}
            placeholder="Explain why you believe the reviewer's decision is wrong. The arbitration panel will read this note."
            className={`font-bengali w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
              noteError
                ? "border-red-500 focus:border-red-600 focus:ring-red-200"
                : "border-slate-300 focus:border-purple-500 focus:ring-purple-200"
            }`}
          />
          <div className="mt-1 flex items-start justify-between gap-3 text-xs">
            {noteError ? (
              <p id={`${noteId}-error`} role="alert" className="font-medium text-red-600">
                {noteError}
              </p>
            ) : (
              <p id={`${noteId}-hint`} className="text-slate-400">
                Submitting opens an arbitration case and moves this entry to {STATE_LABEL.ARBITRATION}.
              </p>
            )}
            <span className={`shrink-0 font-mono ${noteLength > noteMax ? "text-red-600" : "text-slate-400"}`}>
              {noteLength}/{noteMax}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={busy !== null}
              onClick={submitDispute}
              className="rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-800 disabled:opacity-50"
            >
              {busy === "DISPUTE" ? "Submitting…" : `⚖ ${dispute.label}`}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setDisputeOpen(false);
                setNote("");
                setNoteTouched(false);
                setServerNoteError(null);
              }}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
