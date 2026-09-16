"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useOptionalAuthSession } from "@/lib/session-context";

/**
 * Two-step password change (SRS §3.2):
 *   Step 1 — verify the current password; an OTP is emailed to the
 *            registered address.
 *   Step 2 — enter the OTP plus the new password.
 */
export function ChangePasswordForm({
  minLength,
  firstLogin,
}: {
  minLength: number;
  firstLogin: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const auth = useOptionalAuthSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [current, setCurrent] = useState("");
  const [otp, setOtp] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [validMinutes, setValidMinutes] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send the OTP.");
        return;
      }
      setMaskedEmail(data.maskedEmail);
      setDemoOtp(data.demoOtp);
      setValidMinutes(data.validMinutes ?? 5);
      setOtp("");
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    if (next !== confirm) {
      setError(t("passwordsMismatch"));
      return;
    }
    if (next.trim().length < minLength) {
      setError(t("passwordTooShort").replace("{n}", String(minLength)));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: current,
          otp,
          newPassword: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Password change failed.");
        return;
      }
      await auth?.refresh();
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

  const stepBadge = (n: 1 | 2, label: string) => (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
        step === n ? "text-emerald-700" : "text-slate-400"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
          step === n
            ? "bg-emerald-700 text-white"
            : step > n
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-500"
        }`}
      >
        {step > n ? "✓" : n}
      </span>
      {label}
    </span>
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        if (step === 1) requestOtp();
        else submit();
      }}
    >
      <div className="flex items-center gap-4">
        {stepBadge(1, t("stepVerifyIdentity"))}
        <span className="h-px flex-1 bg-slate-200" />
        {stepBadge(2, t("stepOtpNewPassword"))}
      </div>

      {step === 1 ? (
        <>
          <div>
            <label
              htmlFor="current"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              {firstLogin ? t("oneTimePassword") : t("currentPassword")}
            </label>
            <input
              id="current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className={field}
            />
            <p className="mt-1 text-xs text-slate-400">{t("otpAfterVerify")}</p>
          </div>
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !current}
            className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t("sendingOtp") : t("verifySendOtp")}
          </button>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <p className="font-semibold text-emerald-800">
              {t("otpSentTo")} {maskedEmail} ({t("validFor")} {validMinutes}{" "}
              {t("minutes")}).
            </p>
            <p className="mt-1 text-xs text-emerald-700">{t("demoOtpShows")}</p>
            <code className="mt-1 block w-fit rounded-lg bg-white px-3 py-1.5 font-mono text-base font-bold tracking-[0.3em] text-emerald-900 ring-1 ring-emerald-200">
              {demoOtp}
            </code>
          </div>
          <div>
            <label
              htmlFor="otp"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              {t("otpFromEmail")}
            </label>
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              placeholder="6-digit code"
              className={`${field} tracking-[0.3em]`}
            />
          </div>
          <div>
            <label
              htmlFor="next"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              {t("newPassword")}
            </label>
            <input
              id="next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className={field}
            />
            <p className="mt-1 text-xs text-slate-400">
              {t("minChars").replace("{n}", String(minLength))}
            </p>
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              {t("confirmNewPassword")}
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={field}
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || otp.length !== 6 || !next || !confirm}
            className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t("saving") : t("setNewPasswordBtn")}
          </button>
          <button
            type="button"
            onClick={requestOtp}
            disabled={busy}
            className="w-full text-center text-xs font-semibold text-slate-400 transition hover:text-emerald-700 disabled:opacity-50"
          >
            {t("resendOtp")}
          </button>
        </>
      )}
    </form>
  );
}
