"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface IssuedCredential {
  username: string;
  email: string;
  demoOneTimePassword: string;
}

function IssuedBanner({ issued }: { issued: IssuedCredential }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
      <p className="font-semibold text-emerald-800">
        One-time credential generated and emailed to {issued.email}:
      </p>
      <code className="mt-1 block rounded-lg bg-white px-3 py-2 font-mono text-base font-bold text-emerald-900 ring-1 ring-emerald-200">
        {issued.username} / {issued.demoOneTimePassword}
      </code>
      <p className="mt-1 text-xs text-emerald-700">
        The password is valid for a single login and must be changed
        immediately. Demo deployment shows it here — in production it is
        delivered exclusively by email.
      </p>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "CONTRIBUTOR", label: "Lexical Contributor" },
  { value: "LEXICAL_EDITOR", label: "Lexical Editor" },
  { value: "CHIEF_LEXICAL_EDITOR", label: "Chief Lexical Editor" },
  { value: "ARBITRATION_CURATOR", label: "Arbitration Curator" },
  { value: "SYSTEM_MODERATOR", label: "System Moderator" },
  { value: "PLATFORM_ARCHITECT", label: "Platform Architect" },
];

/**
 * Create a user account and issue its initial credential (SRS §3.2).
 * The Architect also fills in the author information (name, DOB,
 * institution, occupation) shown on the author profile.
 */
export function CreateUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CONTRIBUTOR");
  const [dob, setDob] = useState("");
  const [institution, setInstitution] = useState("");
  const [occupation, setOccupation] = useState("");
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          email,
          role,
          dob,
          institution,
          occupation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create user.");
        return;
      }
      setIssued(data.credential);
      setName("");
      setUsername("");
      setEmail("");
      setDob("");
      setInstitution("");
      setOccupation("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

  return (
    <div className="space-y-4">
      {issued ? <IssuedBanner issued={issued} /> : null}
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Full name
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. Amina Khatun" className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Username
          </label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. amina.k" className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Registered email
          </label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. amina@lkc.ac.bd" className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Role
          </label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Date of birth
          </label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Institution
          </label>
          <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. University of Dhaka" className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Occupation
          </label>
          <input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. University Teacher" className={field} />
        </div>
      </div>
      <p className="text-xs text-slate-400">
        The author information (name, date of birth, institution, occupation)
        is shown on the user&apos;s author profile and can only be set by the
        Platform Architect.
      </p>
      <button
        onClick={create}
        disabled={
          busy ||
          !name.trim() ||
          !username.trim() ||
          !email.trim() ||
          !dob ||
          !institution.trim() ||
          !occupation.trim()
        }
        className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
      >
        {busy ? "Creating…" : "👤 Create User & Email Credential"}
      </button>
    </div>
  );
}

/** Force-reset an existing user's credential (new one-time password). */
export function ForceResetButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (
      !window.confirm(
        "Force-reset this credential? A new one-time password is generated and all active sessions are invalidated."
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) setIssued(data.credential);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-2">
      <button
        onClick={reset}
        disabled={busy}
        className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100 disabled:opacity-50"
      >
        {busy ? "…" : "Force Reset"}
      </button>
      {issued ? (
        <code className="rounded-lg bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
          {issued.demoOneTimePassword}
        </code>
      ) : null}
    </div>
  );
}

/** Deactivate / reactivate a credential. */
export function CredentialToggle({
  credentialId,
  deactivated,
}: {
  credentialId: string;
  deactivated: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (
      !deactivated &&
      !window.confirm(
        "Deactivate this credential? All active sessions for the account are immediately invalidated."
      )
    )
      return;
    setBusy(true);
    await fetch(`/api/credentials/${credentialId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deactivated: !deactivated }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
        deactivated
          ? "bg-emerald-700 text-white hover:bg-emerald-800"
          : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100"
      }`}
    >
      {busy ? "…" : deactivated ? "Reactivate" : "Deactivate"}
    </button>
  );
}
