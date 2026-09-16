"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useOptionalAuthSession } from "@/lib/session-context";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const auth = useOptionalAuthSession();
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
          await document.requestStorageAccess?.();
        } catch {
          // Continue — user may need to open the direct tab link.
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

      // Load full session/profile payload for the rest of the UI.
      await auth?.refresh();

      const dest = data.mustChangePassword ? "/change-password" : "/dashboard";
      if (typeof window !== "undefined" && window.self !== window.top) {
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
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(1.5rem,4vw,1.875rem)] font-bold tracking-tight text-slate-900">
        {t("signInTitle")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">{t("signInIntro")}</p>

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
            {t("username")}
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
            {t("password")}
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
          {busy ? t("signingIn") : t("signIn")}
        </button>
        <p className="text-center text-xs">
          <Link
            href="/forgot-password"
            className="font-semibold text-emerald-700 hover:underline"
          >
            {t("forgotYourPassword")}
          </Link>
        </p>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-slate-400">{t("sessionNote")}</p>
    </div>
  );
}
