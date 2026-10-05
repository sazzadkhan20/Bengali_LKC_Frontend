"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export type ApplicationStatus = "NEW" | "APPROVED" | "REJECTED";

export type Application = {
  id: string;
  name: string;
  email: string;
  phone: string;
  institution: string | null;
  interestRole: string | null;
  message: string;
  status: ApplicationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  createdAt: string;
  issuedUserId: string | null;
  issuedUsername: string | null;
  issuedRole: string | null;
};

const INTEREST_LABEL: Record<string, string> = {
  CONTRIBUTOR: "Lexical Contributor",
  LEXICAL_EDITOR: "Lexical Editor",
  CHIEF_LEXICAL_EDITOR: "Chief Lexical Editor",
  ARBITRATION_CURATOR: "Arbitration Curator",
  SYSTEM_MODERATOR: "System Moderator",
  PLATFORM_ARCHITECT: "Platform Architect",
  OTHER: "Other / not listed",
};

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  NEW: "bg-sky-50 text-sky-700 ring-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  NEW: "Awaiting review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function dhakaDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ApplicationCard({ app }: { app: Application }) {
  const router = useRouter();
  const noteId = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setError(null);
  }

  async function reject() {
    const trimmed = note.trim();
    if (trimmed.length < 5) {
      setError("Give the applicant a short reason (at least 5 characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed, notify }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.errors?.note ?? data.error ?? "Could not reject the application. Please try again.");
        return;
      }
      setOpen(false);
      setDone(
        data.emailed
          ? `Rejected. ${app.name} was emailed your note.`
          : notify
            ? "Rejected. The decision email could not be sent — contact the applicant directly if needed."
            : "Rejected without emailing the applicant."
      );
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="break-words text-base font-bold text-slate-900">{app.name}</h3>
          <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span className="font-mono">{app.id}</span>
            <span>Received {dhakaDateTime(app.createdAt)}</span>
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${STATUS_STYLE[app.status]}`}
        >
          {STATUS_LABEL[app.status]}
        </span>
      </header>

      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-slate-400">Email</dt>
          <dd className="min-w-0 break-all">
            <a href={`mailto:${app.email}`} className="font-medium text-emerald-700 hover:underline">
              {app.email}
            </a>
          </dd>
          <dt className="text-slate-400">Phone</dt>
          <dd className="min-w-0 break-words">
            <a href={`tel:${app.phone.replace(/[^+0-9]/g, "")}`} className="text-slate-700 hover:underline">
              {app.phone}
            </a>
          </dd>
          <dt className="text-slate-400">Institution</dt>
          <dd className="min-w-0 break-words text-slate-700">{app.institution ?? "—"}</dd>
          <dt className="text-slate-400">Interest</dt>
          <dd className="min-w-0 text-slate-700">
            {app.interestRole ? INTEREST_LABEL[app.interestRole] ?? app.interestRole : "Not sure yet"}
          </dd>
        </dl>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Why they want to join</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{app.message}</p>
        </div>
      </div>

      {app.status !== "NEW" ? (
        <div
          className={`border-t px-4 py-3 text-sm sm:px-5 ${
            app.status === "APPROVED" ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/50"
          }`}
        >
          <p className="text-slate-700">
            {app.status === "APPROVED" ? "Approved" : "Rejected"} by {app.reviewerName ?? "a Platform Architect"} on{" "}
            {dhakaDateTime(app.reviewedAt)}.
          </p>
          {app.status === "APPROVED" && app.issuedUserId ? (
            <p className="mt-1 text-slate-700">
              Account issued:{" "}
              <Link
                href={`/dashboard/community/profile/${encodeURIComponent(app.issuedUserId)}`}
                className="font-mono font-semibold text-emerald-700 hover:underline"
              >
                {app.issuedUsername ?? app.issuedUserId}
              </Link>
              {app.issuedRole ? ` · ${INTEREST_LABEL[app.issuedRole] ?? app.issuedRole}` : ""}
            </p>
          ) : null}
          {app.status === "REJECTED" && app.reviewNote ? (
            <p className="mt-1 whitespace-pre-line break-words text-slate-600">
              <span className="font-semibold text-slate-700">Note:</span> {app.reviewNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {done ? (
        <p role="status" className="border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-emerald-700 sm:px-5">
          {done}
        </p>
      ) : null}

      {app.status === "NEW" ? (
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-200 transition hover:bg-red-50"
          >
            Reject…
          </button>
          <Link
            href={`/dashboard/credentials?application=${encodeURIComponent(app.id)}`}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Approve & issue account →
          </Link>
        </footer>
      ) : null}

      <ConfirmModal
        open={open}
        title={`Reject ${app.name}'s application?`}
        description="The note is stored with the application and, if you choose, emailed to the applicant."
        confirmLabel="Reject application"
        tone="danger"
        busy={busy}
        onCancel={close}
        onConfirm={reject}
      >
        <label htmlFor={noteId} className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Reason for the applicant
        </label>
        <textarea
          id={noteId}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            if (error) setError(null);
          }}
          rows={4}
          maxLength={500}
          aria-invalid={error ? true : undefined}
          placeholder="e.g. We are not onboarding new editors this quarter. Please apply again in January."
          className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
              : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
          }`}
        />
        <div className="mt-1 flex items-start justify-between gap-3">
          <p className="min-w-0 text-xs font-medium text-red-600">{error}</p>
          <p className="shrink-0 text-[11px] text-slate-400">{note.length}/500</p>
        </div>
        <label className="mt-2 flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
          />
          <span>
            Email this note to <span className="break-all font-medium">{app.email}</span>
          </span>
        </label>
      </ConfirmModal>
    </article>
  );
}
