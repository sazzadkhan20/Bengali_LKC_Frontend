"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useOptionalAuthSession } from "@/lib/session-context";
import { PasswordInput } from "@/components/ui/PasswordInput";

type FieldErrors = {
  username?: string;
  password?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-rose-600">{message}</p>;
}

function inputClass(invalid: boolean) {
  return [
    "w-full rounded-xl border bg-white px-4 py-3 font-mono text-sm shadow-sm outline-none transition",
    invalid
      ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
      : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200",
  ].join(" ");
}

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const auth = useOptionalAuthSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function clientValidate(): FieldErrors {
    const next: FieldErrors = {};
    if (!username.trim()) {
      next.username = "Enter your username or email address.";
    }
    if (!password) {
      next.password = "Enter your password.";
    }
    return next;
  }

  async function login(user: string, pass: string) {
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
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
      const data = (await res.json()) as {
        error?: string;
        errors?: FieldErrors;
        mustChangePassword?: boolean;
      };

      if (!res.ok) {
        if (data.errors && (data.errors.username || data.errors.password)) {
          setFieldErrors({
            username: data.errors.username,
            password: data.errors.password,
          });
        } else {
          setFormError(data.error ?? "Login failed.");
        }
        return;
      }

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
          const local = clientValidate();
          if (local.username || local.password) {
            setFieldErrors(local);
            setFormError(null);
            return;
          }
          login(username.trim(), password);
        }}
        noValidate
      >
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            {t("usernameOrEmail")}
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldErrors.username) {
                setFieldErrors((prev) => ({ ...prev, username: undefined }));
              }
            }}
            placeholder="e.g. contributor or you@example.com"
            autoComplete="username"
            aria-invalid={Boolean(fieldErrors.username)}
            className={inputClass(Boolean(fieldErrors.username))}
          />
          <FieldError message={fieldErrors.username} />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            {t("password")}
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="••••••••••"
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.password)}
            className={inputClass(Boolean(fieldErrors.password))}
          />
          <FieldError message={fieldErrors.password} />
        </div>
        {formError ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
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
