"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
import { z } from "zod";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { CaseSide } from "@/lib/arbitration";

type ApiResult = { ok?: boolean; error?: string; errors?: Record<string, string> };

async function post(caseId: string, body: Record<string, unknown>): Promise<{ status: number; data: ApiResult }> {
  try {
    const res = await fetch(`/api/arbitration/${encodeURIComponent(caseId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: (await res.json().catch(() => ({}))) as ApiResult };
  } catch {
    return { status: 0, data: { error: "Could not reach the server. Check your connection and try again." } };
  }
}

function textSchema(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);
}

function Counter({ length, min, max }: { length: number; min: number; max: number }) {
  const tone = length > max ? "text-red-600" : length >= min ? "text-emerald-700" : "text-slate-400";
  return (
    <span className={`text-[11px] font-semibold tabular-nums ${tone}`}>
      {length} / {max}
      {length < min ? ` · ${min - length} more needed` : ""}
    </span>
  );
}

/* ---- Party note: submit or update until the response window is closed ---- */
export function PartyNoteForm({
  caseId,
  side,
  currentNote,
  min,
  max,
  closesAtLabel,
}: {
  caseId: string;
  side: CaseSide;
  currentNote: string | null;
  min: number;
  max: number;
  closesAtLabel: string;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [editing, setEditing] = useState(currentNote === null);
  const [note, setNote] = useState(currentNote ?? "");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setConfirming(false), []);
  const label = "Your note";

  const fieldError = useMemo(() => {
    if (serverError) return serverError;
    if (!touched && note.length === 0) return null;
    const check = textSchema(label, min, max).safeParse(note);
    if (!check.success) return check.error.issues[0]?.message ?? "Invalid note.";
    if (currentNote !== null && note.trim() === currentNote.trim()) return "Your note is unchanged.";
    return null;
  }, [note, touched, min, max, serverError, currentNote]);
  const valid = textSchema(label, min, max).safeParse(note).success
    && (currentNote === null || note.trim() !== currentNote.trim());

  async function submit() {
    setBusy(true);
    setError(null);
    const { status, data } = await post(caseId, { action: "note", note: note.trim() });
    setBusy(false);
    setConfirming(false);
    if (status === 200) {
      setSuccess(currentNote === null ? "Your note was submitted." : "Your note was updated.");
      setEditing(false);
      setTouched(false);
      router.refresh();
      return;
    }
    if (data.errors?.note) setServerError(data.errors.note);
    else setError(data.error ?? "Your note could not be saved. Please try again.");
    if (status === 409) router.refresh();
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        {success ? (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            ✓ {success}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setSuccess(null);
            setNote(currentNote ?? "");
            setServerError(null);
            setEditing(true);
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200 transition hover:bg-violet-50"
        >
          ✎ Update my note
        </button>
        <p className="text-[11px] text-slate-500">You can update your note until {closesAtLabel}.</p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (valid) setConfirming(true);
      }}
      className="space-y-2"
    >
      <label htmlFor={fieldId} className="block text-xs font-bold text-slate-700">
        {currentNote === null ? "Submit your note" : "Update your note"}
        <span className="ml-1 font-normal text-slate-500">
          — {side === "CONTRIBUTOR" ? "explain why your entry is correct" : "explain why your decision is correct"}
        </span>
      </label>
      <textarea
        id={fieldId}
        value={note}
        rows={5}
        onChange={(e) => {
          setNote(e.target.value);
          setServerError(null);
          setError(null);
        }}
        onBlur={() => setTouched(true)}
        aria-invalid={Boolean(fieldError)}
        aria-describedby={`${fieldId}-help`}
        className={`font-bengali w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${
          fieldError ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-violet-500 focus:ring-violet-200"
        }`}
        placeholder={`Between ${min} and ${max} characters`}
      />
      <div id={`${fieldId}-help`} className="flex flex-wrap items-center justify-between gap-2">
        {fieldError ? <span className="text-xs font-medium text-red-600">{fieldError}</span> : <span />}
        <Counter length={note.trim().length} min={min} max={max} />
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={!valid || busy}
          className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {currentNote === null ? "Submit note" : "Save changes"}
        </button>
        {currentNote !== null ? (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setNote(currentNote);
              setServerError(null);
              setError(null);
            }}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <ConfirmModal
        open={confirming}
        title={currentNote === null ? "Submit your note?" : "Save your updated note?"}
        tone="primary"
        confirmLabel={currentNote === null ? "Submit note" : "Save changes"}
        busy={busy}
        onConfirm={submit}
        onCancel={close}
        description={
          <>
            Curators will read this note when they vote. You can still change it until {closesAtLabel}; after the
            daily check closes the window it becomes read-only.
          </>
        }
      />
    </form>
  );
}

/* ---- Curator vote: pick a side and give a mandatory rationale ---- */
export function CuratorVotePanel({
  caseId,
  reviewerLabel,
  contributorName,
  reviewerName,
  min,
  max,
}: {
  caseId: string;
  reviewerLabel: string;
  contributorName: string;
  reviewerName: string;
  min: number;
  max: number;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [verdict, setVerdict] = useState<CaseSide | null>(null);
  const [rationale, setRationale] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setConfirming(false), []);

  const schema = useMemo(
    () =>
      z.object({
        verdict: z.enum(["CONTRIBUTOR", "REVIEWER"], { message: "Choose which side you support." }),
        rationale: textSchema("Rationale", min, max),
      }),
    [min, max]
  );
  const parsed = schema.safeParse({ verdict: verdict ?? undefined, rationale });
  const issues = parsed.success
    ? {}
    : Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
  const verdictError = serverErrors.verdict || (touched ? issues.verdict : undefined);
  const rationaleError =
    serverErrors.rationale || (touched || rationale.length > 0 ? issues.rationale : undefined);

  async function submit() {
    if (!parsed.success) return;
    setBusy(true);
    setError(null);
    const { status, data } = await post(caseId, {
      action: "vote",
      verdict: parsed.data.verdict,
      rationale: parsed.data.rationale,
    });
    setBusy(false);
    setConfirming(false);
    if (status === 200) {
      router.refresh();
      return;
    }
    if (data.errors) setServerErrors(data.errors);
    setError(data.error ?? (data.errors ? null : "Your vote could not be recorded. Please try again."));
    if (status === 409 || status === 403) router.refresh();
  }

  const options: { value: CaseSide; title: string; desc: string; tone: string }[] = [
    {
      value: "CONTRIBUTOR",
      title: `Support the contributor`,
      desc: `${contributorName}'s entry should pass this stage.`,
      tone: "peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:ring-emerald-500",
    },
    {
      value: "REVIEWER",
      title: `Support the ${reviewerLabel}`,
      desc: `${reviewerName}'s decision should stand.`,
      tone: "peer-checked:border-rose-500 peer-checked:bg-rose-50 peer-checked:ring-rose-500",
    },
  ];

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (parsed.success) setConfirming(true);
      }}
      className="space-y-4"
    >
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-slate-700">Your verdict</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <label key={o.value} className="cursor-pointer">
              <input
                type="radio"
                name={`verdict-${caseId}`}
                value={o.value}
                checked={verdict === o.value}
                onChange={() => {
                  setVerdict(o.value);
                  setServerErrors((e) => ({ ...e, verdict: "" }));
                }}
                className="peer sr-only"
              />
              <span
                className={`block rounded-xl border border-slate-200 px-4 py-3 ring-1 ring-transparent transition hover:border-slate-300 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-400 ${o.tone}`}
              >
                <span className="block text-sm font-bold text-slate-800">{o.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{o.desc}</span>
              </span>
            </label>
          ))}
        </div>
        {verdictError ? <p className="mt-1.5 text-xs font-medium text-red-600">{verdictError}</p> : null}
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="block text-xs font-bold text-slate-700">
          Rationale <span className="font-normal text-slate-500">(mandatory, {min}–{max} characters)</span>
        </label>
        <textarea
          id={fieldId}
          rows={5}
          value={rationale}
          onChange={(e) => {
            setRationale(e.target.value);
            setServerErrors((er) => ({ ...er, rationale: "" }));
          }}
          onBlur={() => setTouched(true)}
          aria-invalid={Boolean(rationaleError)}
          placeholder="Explain which arguments convinced you and why."
          className={`font-bengali w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${
            rationaleError ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-violet-500 focus:ring-violet-200"
          }`}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {rationaleError ? <span className="text-xs font-medium text-red-600">{rationaleError}</span> : <span />}
          <Counter length={rationale.trim().length} min={min} max={max} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!parsed.success || busy}
        className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Cast vote
      </button>

      <ConfirmModal
        open={confirming}
        title="Cast your vote?"
        tone="primary"
        confirmLabel="Cast vote"
        busy={busy}
        onConfirm={submit}
        onCancel={close}
        description={
          <>
            You are voting to{" "}
            <strong>
              {verdict === "CONTRIBUTOR" ? "support the contributor" : `support the ${reviewerLabel}`}
            </strong>
            . Votes are final and cannot be changed. Individual votes stay hidden until voting closes.
          </>
        }
      />
    </form>
  );
}

/* ---- Simple case action (System Moderator corrections) ---- */
export function CaseButton({
  caseId,
  action,
  label,
  className = "rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-900 disabled:opacity-50",
}: {
  caseId: string;
  action: "apply_correction";
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      {error ? <p className="mb-2 text-xs font-medium text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const { status, data } = await post(caseId, { action });
          setBusy(false);
          if (status !== 200) setError(data.error ?? "Action failed.");
          else router.refresh();
        }}
        className={className}
      >
        {label}
      </button>
    </div>
  );
}
