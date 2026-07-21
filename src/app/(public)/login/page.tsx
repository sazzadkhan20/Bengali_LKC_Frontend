"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO_CREDENTIALS = [
  { username: "architect", password: "architect2026", role: "Platform Architect", desc: "Full system governance" },
  { username: "moderator", password: "moderator2026", role: "System Moderator", desc: "Queue governance, tie-breaks" },
  { username: "contributor", password: "contributor2026", role: "Lexical Contributor", desc: "Quick Input data entry" },
  { username: "editor", password: "editor2026", role: "Lexical Editor", desc: "Primary validation" },
  { username: "chief", password: "chief2026", role: "Chief Lexical Editor", desc: "Final linguistic validation" },
  { username: "curator", password: "curator2026", role: "Arbitration Curator", desc: "Panel dispute voting" },
  { username: "mita.c", password: "welcome-mita-2026", role: "Lexical Contributor", desc: "One-time password — first-login change demo" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login(user: string, pass: string) {
    setBusy(true);
    setError(null);
    try {
      if (typeof document !== "undefined" && window.self !== window.top) {
        try {
          // HF Spaces iframe: ask the browser to allow cookies for this origin.
          await document.requestStorageAccess?.();
        } catch {
          // Continue — user may need to open the direct tab link above.
        }
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }

      const dest = data.mustChangePassword ? "/change-password" : "/dashboard";
      if (typeof window !== "undefined" && window.self !== window.top) {
        // Full-page navigation keeps the session cookie in a first-party tab.
        window.open(`${window.location.origin}${dest}`, "_blank", "noopener");
        return;
      }

      router.push(dest);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-16 lg:grid-cols-2">
      <div>
        <h1 className="text-[clamp(1.5rem,4vw,1.875rem)] font-bold tracking-tight text-slate-900">
          Sign in with your credentials
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Access to the Bengali LKC platform is credential-based (SRS §3.2).
          Your username and one-time password are issued exclusively by the
          Platform Architect and delivered to your registered email address.
          The one-time password must be changed at first login. If you
          don&apos;t have a credential, contact the project team.
        </p>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
          On Hugging Face Spaces, use the <strong>Open in full tab</strong> link
          at the top of the page before signing in — embedded previews block
          session cookies in most browsers.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (username.trim() && password) login(username.trim(), password);
          }}
        >
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. contributor"
              autoComplete="username"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-xs">
            <Link
              href="/forgot-password"
              className="font-semibold text-emerald-700 hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-slate-400">
          Sessions expire after 60 minutes of inactivity. Credential issuance,
          password resets and first-login password changes are recorded in
          the tamper-evident audit trail.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-bold text-slate-800">
          Demonstration credentials
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          This is a demo deployment — click any credential to explore that
          role&apos;s dashboard and permissions.
        </p>
        <ul className="mt-4 divide-y divide-slate-100">
          {DEMO_CREDENTIALS.map((d) => (
            <li key={d.username}>
              <button
                type="button"
                onClick={() => login(d.username, d.password)}
                disabled={busy}
                className="group flex w-full items-center gap-3 px-1 py-3 text-left transition hover:bg-emerald-50/60 disabled:opacity-50 sm:gap-4 sm:px-2"
              >
                <code className="shrink-0 rounded-lg bg-slate-100 px-2 py-1.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 group-hover:bg-white sm:px-2.5 sm:text-xs">
                  {d.username}
                </code>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {d.role}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {d.desc}
                  </span>
                </span>
                <span className="ml-auto shrink-0 text-slate-300 transition group-hover:text-emerald-600">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Passwords follow the pattern <code className="font-mono">{"{username}"}2026</code>.
          The <code className="font-mono">mita.c</code> account still holds its
          system-generated one-time password and demonstrates the mandatory
          first-login password change.
        </p>
      </div>
    </div>
  );
}
