"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { STATE_LABEL } from "@/lib/format";
import type { EntryState } from "@/lib/types";

export type ReviewDecision = "APPROVE" | "FLAG" | "REJECT" | "VALIDATE" | "C_FLAG" | "ESCALATE";

export type ReviewOption = {
  decision: ReviewDecision;
  label: string;
  toState: EntryState;
  commentRequired: boolean;
  commentMin: number;
};

export type ReviewOptions = {
  commentMax: number;
  blockedReason: string | null;
  decisions: ReviewOption[];
};

const STYLE: Record<ReviewDecision, { icon: string; className: string }> = {
  APPROVE: { icon: "✓", className: "bg-emerald-700 hover:bg-emerald-800 text-white" },
  FLAG: { icon: "⚑", className: "bg-amber-600 hover:bg-amber-700 text-white" },
  REJECT: { icon: "✕", className: "bg-rose-600 hover:bg-rose-700 text-white" },
  VALIDATE: { icon: "✓", className: "bg-emerald-700 hover:bg-emerald-800 text-white" },
  C_FLAG: { icon: "⚑", className: "bg-fuchsia-700 hover:bg-fuchsia-800 text-white" },
  ESCALATE: { icon: "⚖", className: "bg-purple-700 hover:bg-purple-800 text-white" },
};

/** Mirrors ReviewService.validateComment: the minimum applies whenever a comment is given. */
function commentSchema(option: ReviewOption, max: number) {
  const base = z.string().trim().max(max, `Comment must be at most ${max} characters.`);
  const minMessage = `Comment must be at least ${option.commentMin} characters.`;
  if (option.commentRequired) {
    return base
      .min(1, `A comment / reason is required to ${option.label.toLowerCase()}.`)
      .min(option.commentMin, minMessage);
  }
  return base.refine((v) => v.length === 0 || v.length >= option.commentMin, minMessage);
}

/** Mirrors ReviewService.validateComment for ESCALATE: the note becomes the case's dispute note. */
function disputeNoteSchema(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, "A dispute note is required.")
    .min(min, `Dispute note must be at least ${min} characters.`)
    .max(max, `Dispute note must be at most ${max} characters.`);
}

type ReviewResult = {
  state?: EntryState;
  caseId?: string;
  error?: string;
  errors?: Record<string, string>;
};

function placeholderFor(decisions: ReviewOption[]): string {
  const optional = decisions.filter((d) => !d.commentRequired);
  const required = decisions.filter((d) => d.commentRequired);
  const names = (list: ReviewOption[]) => list.map((d) => d.label.toLowerCase()).join(", ");
  const parts: string[] = [];
  if (optional.length) {
    const min = Math.max(...optional.map((d) => d.commentMin));
    parts.push(`Optional for ${names(optional)}${min > 0 ? ` (min ${min} characters if given)` : ""}.`);
  }
  if (required.length) {
    const min = Math.max(...required.map((d) => d.commentMin));
    parts.push(`Required for ${names(required)} (min ${min} characters).`);
  }
  return parts.join(" ");
}

export function ReviewDecisionPanel({
  submissionId,
  version,
  options,
}: {
  submissionId: string;
  version?: number | null;
  options: ReviewOptions;
}) {
  const router = useRouter();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [comment, setComment] = useState("");
  const [selected, setSelected] = useState<ReviewOption | null>(null);
  const [serverCommentError, setServerCommentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<ReviewDecision | null>(null);
  const noteId = useId();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  const [serverNoteError, setServerNoteError] = useState<string | null>(null);

  const max = options.commentMax;
  const length = comment.trim().length;
  const dispute = options.decisions.find((d) => d.decision === "ESCALATE");
  const decisions = options.decisions.filter((d) => d.decision !== "ESCALATE");
  const noteMin = dispute?.commentMin ?? 15;
  const noteLength = note.trim().length;

  const noteError = useMemo(() => {
    if (serverNoteError) return serverNoteError;
    if (!noteTouched) return null;
    const check = disputeNoteSchema(noteMin, max).safeParse(note);
    return check.success ? null : (check.error.issues[0]?.message ?? "Invalid dispute note.");
  }, [note, noteTouched, noteMin, max, serverNoteError]);

  // Live validation against the decision the reviewer last tried; the length cap applies always.
  const commentError = useMemo(() => {
    if (serverCommentError) return serverCommentError;
    const check = selected
      ? commentSchema(selected, max).safeParse(comment)
      : z.string().trim().max(max, `Comment must be at most ${max} characters.`).safeParse(comment);
    return check.success ? null : (check.error.issues[0]?.message ?? "Invalid comment.");
  }, [comment, selected, max, serverCommentError]);

  /** Posts the decision; returns the error map on a field error, or true on success. */
  async function send(
    option: ReviewOption,
    text: string
  ): Promise<true | Record<string, string> | null> {
    setBusy(option.decision);
    try {
      const res = await fetch(`/api/submissions/${encodeURIComponent(submissionId)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: option.decision,
          comment: text || undefined,
          expectedVersion: version ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ReviewResult;
      if (!res.ok) {
        if (data.errors?.comment || data.errors?.note) return data.errors;
        setError(
          data.error ??
            Object.values(data.errors ?? {})[0] ??
            "The review could not be saved. Please try again."
        );
        // Someone else changed the entry: show its real state.
        if (res.status === 409) router.refresh();
        return null;
      }
      const state = data.state ? (STATE_LABEL[data.state] ?? data.state) : "updated";
      setSuccess(
        `Status changed to ${state}.${data.caseId ? ` Arbitration case ${data.caseId} opened.` : ""}`
      );
      router.refresh();
      return true;
    } catch {
      setError("Network error — the review was not saved. Please try again.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function submit(option: ReviewOption) {
    setSelected(option);
    setServerCommentError(null);
    setError(null);
    setSuccess(null);
    const parsed = commentSchema(option, max).safeParse(comment);
    if (!parsed.success) {
      textareaRef.current?.focus();
      return;
    }
    const result = await send(option, parsed.data);
    if (result === true) {
      setComment("");
      setSelected(null);
    } else if (result?.comment) {
      setServerCommentError(result.comment);
      textareaRef.current?.focus();
    }
  }

  function openDispute() {
    setDisputeOpen(true);
    setError(null);
    setSuccess(null);
    setTimeout(() => noteRef.current?.focus(), 0);
  }

  function closeDispute() {
    setDisputeOpen(false);
    setNote("");
    setNoteTouched(false);
    setServerNoteError(null);
    setError(null);
  }

  async function submitDispute() {
    if (!dispute) return;
    setNoteTouched(true);
    setServerNoteError(null);
    setError(null);
    setSuccess(null);
    const parsed = disputeNoteSchema(noteMin, max).safeParse(note);
    if (!parsed.success) {
      noteRef.current?.focus();
      return;
    }
    const result = await send(dispute, parsed.data);
    if (result === true) {
      setNote("");
      setNoteTouched(false);
      setDisputeOpen(false);
    } else if (result) {
      setServerNoteError(result.note ?? result.comment ?? null);
      noteRef.current?.focus();
    }
  }

  const describedBy = commentError ? `${textareaId}-error` : `${textareaId}-hint`;

  return (
    <div className="space-y-4">
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

      {options.blockedReason ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          {options.blockedReason}
        </p>
      ) : disputeOpen && dispute ? (
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
          <label
            htmlFor={noteId}
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Dispute note
            <span className="ml-1 normal-case text-slate-500">
              — required ({noteMin}–{max} characters)
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
            aria-describedby={noteError ? `${noteId}-error` : `${noteId}-hint`}
            placeholder="Explain why this entry needs arbitration. The arbitration panel and the contributor will read this note."
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
                Submitting opens an arbitration case in your name and moves this entry to{" "}
                {STATE_LABEL.ARBITRATION}.
              </p>
            )}
            <span className={`shrink-0 font-mono ${noteLength > max ? "text-red-600" : "text-slate-400"}`}>
              {noteLength}/{max}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={busy !== null}
              onClick={submitDispute}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-50 ${STYLE.ESCALATE.className}`}
            >
              {busy === "ESCALATE" ? "Submitting…" : `${STYLE.ESCALATE.icon} ${dispute.label}`}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={closeDispute}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {decisions.length > 0 ? (
            <div>
              <label
                htmlFor={textareaId}
                className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400"
              >
                Comment / reason
                {selected ? (
                  <span className="ml-1 normal-case text-slate-500">
                    {selected.commentRequired
                      ? `— required for “${selected.label}” (min ${selected.commentMin} characters)`
                      : `— optional for “${selected.label}”${selected.commentMin > 0 ? ` (min ${selected.commentMin} characters if given)` : ""}`}
                  </span>
                ) : null}
              </label>
              <textarea
                id={textareaId}
                ref={textareaRef}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  setServerCommentError(null);
                }}
                rows={4}
                aria-invalid={commentError ? true : undefined}
                aria-describedby={describedBy}
                placeholder={placeholderFor(decisions)}
                className={`font-bengali w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  commentError
                    ? "border-red-500 focus:border-red-600 focus:ring-red-200"
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
                }`}
              />
              <div className="mt-1 flex items-start justify-between gap-3 text-xs">
                {commentError ? (
                  <p id={`${textareaId}-error`} role="alert" className="font-medium text-red-600">
                    {commentError}
                  </p>
                ) : (
                  <p id={`${textareaId}-hint`} className="text-slate-400">
                    Your comment is saved in the workflow history with your name and role.
                  </p>
                )}
                <span className={`shrink-0 font-mono ${length > max ? "text-red-600" : "text-slate-400"}`}>
                  {length}/{max}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2.5">
            {decisions.map((option) => (
              <button
                key={option.decision}
                type="button"
                disabled={busy !== null}
                onClick={() => submit(option)}
                title={`Moves the entry to ${STATE_LABEL[option.toState] ?? option.toState}`}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-50 ${STYLE[option.decision].className}`}
              >
                {busy === option.decision ? "Saving…" : `${STYLE[option.decision].icon} ${option.label}`}
              </button>
            ))}
            {dispute ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={openDispute}
                title={`Opens an arbitration case and moves the entry to ${STATE_LABEL.ARBITRATION}`}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-50 ${STYLE.ESCALATE.className}`}
              >
                {STYLE.ESCALATE.icon} {dispute.label}
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
