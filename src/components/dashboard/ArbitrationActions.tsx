"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Verdict = "APPROVE_CLAIMANT" | "APPROVE_ACCUSED" | "REJECT";

async function post(
  caseId: string,
  body: Record<string, unknown>
): Promise<string | null> {
  const res = await fetch(`/api/arbitration/${caseId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return data.error ?? "Action failed.";
  }
  return null;
}

/* ---- Curator voting interface (SRS §7.6.4) ------------------------ */
export function VotePanel({
  caseId,
  hasAccusedVersion,
}: {
  caseId: string;
  hasAccusedVersion: boolean;
}) {
  const router = useRouter();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [rationale, setRationale] = useState("");
  const [correction, setCorrection] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function vote() {
    if (!verdict) return setError("Select a verdict first.");
    if (rationale.trim().length < 30)
      return setError("A rationale of at least 30 characters is mandatory.");
    setBusy(true);
    const err = await post(caseId, {
      action: "vote",
      verdict,
      rationale: rationale.trim(),
      correctionNote: correction.trim() || undefined,
    });
    setBusy(false);
    if (err) setError(err);
    else router.refresh();
  }

  const options: { value: Verdict; label: string; desc: string }[] = [
    { value: "APPROVE_CLAIMANT", label: "Approve claimant's version", desc: "The disputed entry is accepted as submitted by the claimant." },
    ...(hasAccusedVersion
      ? [{ value: "APPROVE_ACCUSED" as Verdict, label: "Approve accused's version", desc: "The counter-claimed version is accepted." }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}
      <div className={`grid gap-3 ${hasAccusedVersion ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setVerdict(o.value)}
            className={`rounded-xl border p-4 text-left transition ${
              verdict === o.value
                ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                : "border-slate-200 bg-white hover:border-purple-300"
            }`}
          >
            <p className="text-sm font-bold text-slate-800">{o.label}</p>
            <p className="mt-1 text-xs text-slate-500">{o.desc}</p>
          </button>
        ))}
      </div>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={3}
        placeholder="Mandatory rationale (minimum 30 characters)…"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
      />
      {verdict ? (
        <input
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          placeholder="Optional correction note — sent to the System Moderator's Pending Corrections queue"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
        />
      ) : null}
      <button
        onClick={vote}
        disabled={busy}
        className="rounded-xl bg-purple-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-purple-800 disabled:opacity-50"
      >
        {busy ? "Recording vote…" : "Cast Binding Vote"}
      </button>
      <p className="text-[11px] text-slate-400">
        Your individual vote is never shown to contributors or editors — only
        the final verdict and aggregated tally.
      </p>
    </div>
  );
}

/* ---- System Moderator tie-break (SRS §7.6.1) ----------------------- */
export function TieBreakPanel({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide() {
    if (!verdict) return setError("Select the final verdict.");
    if (rationale.trim().length < 30)
      return setError("A tie-break rationale of at least 30 characters is mandatory.");
    setBusy(true);
    const err = await post(caseId, {
      action: "tiebreak",
      verdict,
      rationale: rationale.trim(),
    });
    setBusy(false);
    if (err) setError(err);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["APPROVE_CLAIMANT", "Approve claimant"],
            ["APPROVE_ACCUSED", "Approve accused"],
            ["REJECT", "Reject"],
          ] as [Verdict, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setVerdict(v)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              verdict === v
                ? "border-purple-600 bg-purple-700 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-purple-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={2}
        placeholder="Tie-break rationale (minimum 30 characters)…"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
      />
      <button
        onClick={decide}
        disabled={busy}
        className="rounded-xl bg-purple-700 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-purple-800 disabled:opacity-50"
      >
        Cast Tie-Breaking Verdict
      </button>
    </div>
  );
}

/* ---- Accused counter-claim (SRS §7.3.3) ----------------------------- */
export function RespondPanel({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function respond() {
    setBusy(true);
    const err = await post(caseId, { action: "respond", counterClaim: text });
    setBusy(false);
    if (err) setError(err);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Your counter-claim — explain and defend your original decision…"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
      <button
        onClick={respond}
        disabled={busy}
        className="rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
      >
        Submit Counter-Claim
      </button>
    </div>
  );
}

/* ---- small one-shot buttons ----------------------------------------- */
export function CaseButton({
  caseId,
  action,
  label,
  className = "rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-900 disabled:opacity-50",
}: {
  caseId: string;
  action: "activate" | "apply_correction";
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      {error ? (
        <p className="mb-2 text-xs font-medium text-rose-600">{error}</p>
      ) : null}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const err = await post(caseId, { action });
          setBusy(false);
          if (err) setError(err);
          else router.refresh();
        }}
        className={className}
      >
        {label}
      </button>
    </div>
  );
}
