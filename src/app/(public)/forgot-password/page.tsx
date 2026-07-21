"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [demoPassword, setDemoPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setDemoPassword(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setMessage(data.message);
      if (data.demoOneTimePassword) setDemoPassword(data.demoOneTimePassword);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Forgot your password?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        Enter your username or registered email address. After email
        validation, a new one-time password will be sent to your registered
        address (SRS §3.2). You must change it at your next login.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (identifier.trim() && !busy) submit();
        }}
      >
        <div>
          <label
            htmlFor="identifier"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Username or email
          </label>
          <input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. contributor or saiful@lkc.ac.bd"
            autoComplete="username"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <p className="font-semibold text-emerald-800">{message}</p>
            {demoPassword ? (
              <>
                <code className="mt-2 block rounded-lg bg-white px-3 py-2 font-mono text-base font-bold text-emerald-900 ring-1 ring-emerald-200">
                  {demoPassword}
                </code>
                <p className="mt-1 text-xs text-emerald-700">
                  Demo deployment only — in production this one-time password
                  is delivered exclusively by email.
                </p>
              </>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={busy || !identifier.trim()}
          className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send Reset Email"}
        </button>
        <p className="text-center text-xs">
          <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
            ← Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}
