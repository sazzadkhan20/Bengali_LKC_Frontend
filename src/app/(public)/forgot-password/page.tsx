"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { PasswordInput } from "@/components/ui/PasswordInput";

type FieldErrors = {
  identifier?: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
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

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [validMinutes, setValidMinutes] = useState(5);
  const [minLength, setMinLength] = useState(10);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function clearField(key: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function requestOtp() {
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);
    try {
      const trimmed = identifier.trim();
      if (!trimmed) {
        setFieldErrors({ identifier: "Enter your username or email address." });
        return;
      }

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed }),
      });
      const data = (await res.json()) as {
        error?: string;
        errors?: FieldErrors;
        maskedEmail?: string;
        validMinutes?: number;
        passwordMinLength?: number;
        message?: string;
      };

      if (!res.ok) {
        if (data.errors?.identifier) {
          setFieldErrors({ identifier: data.errors.identifier });
        } else {
          setFormError(data.error ?? "Could not send the OTP.");
        }
        return;
      }

      setMaskedEmail(data.maskedEmail ?? "");
      setValidMinutes(data.validMinutes ?? 5);
      if (typeof data.passwordMinLength === "number") {
        setMinLength(data.passwordMinLength);
      }
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset() {
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);
    try {
      const local: FieldErrors = {};
      if (!otp.trim()) {
        local.otp = "Enter the 6-digit code from your email.";
      } else if (!/^\d{6}$/.test(otp.trim())) {
        local.otp = "OTP must be a 6-digit code.";
      }
      if (!newPassword) {
        local.newPassword = "Enter a new password.";
      } else if (newPassword.trim().length < minLength) {
        local.newPassword = `New password must be at least ${minLength} characters.`;
      }
      if (!confirmPassword) {
        local.confirmPassword = "Confirm your new password.";
      } else if (newPassword !== confirmPassword) {
        local.confirmPassword = "Passwords do not match.";
      }
      if (local.otp || local.newPassword || local.confirmPassword) {
        setFieldErrors(local);
        return;
      }

      const res = await fetch("/api/auth/forgot-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: otp.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        errors?: FieldErrors;
        message?: string;
      };

      if (!res.ok) {
        if (
          data.errors &&
          (data.errors.identifier || data.errors.otp || data.errors.newPassword)
        ) {
          setFieldErrors({
            identifier: data.errors.identifier,
            otp: data.errors.otp,
            newPassword: data.errors.newPassword,
          });
        } else {
          setFormError(data.error ?? "Password reset failed.");
        }
        return;
      }

      setSuccess(
        data.message ??
          "Password updated successfully. You can sign in with your username or email."
      );
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1800);
    } finally {
      setBusy(false);
    }
  }

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
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(1.5rem,4vw,1.875rem)] font-bold tracking-tight text-slate-900">
        {t("forgotTitle")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        {t("forgotIntro")}
      </p>

      <div className="mt-6 flex items-center gap-4">
        {stepBadge(1, t("forgotStepRequestOtp"))}
        <span className="h-px flex-1 bg-slate-200" />
        {stepBadge(2, t("forgotStepSetPassword"))}
      </div>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (step === 1) requestOtp();
          else confirmReset();
        }}
        noValidate
      >
        {step === 1 ? (
          <>
            <div>
              <label
                htmlFor="identifier"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                {t("usernameOrEmail")}
              </label>
              <input
                id="identifier"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  clearField("identifier");
                }}
                placeholder="e.g. contributor or you@example.com"
                autoComplete="username"
                aria-invalid={Boolean(fieldErrors.identifier)}
                className={inputClass(Boolean(fieldErrors.identifier))}
              />
              <FieldError message={fieldErrors.identifier} />
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
              {busy ? t("sendingOtp") : t("sendResetOtp")}
            </button>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
              <p className="font-semibold text-emerald-800">
                {t("otpSentTo")} {maskedEmail} ({t("validFor")} {validMinutes}{" "}
                {t("minutes")}).
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Check your registered email inbox for the verification code, then
                set a new password below.
              </p>
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
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  clearField("otp");
                }}
                autoComplete="one-time-code"
                placeholder="6-digit code"
                aria-invalid={Boolean(fieldErrors.otp)}
                className={`${inputClass(Boolean(fieldErrors.otp))} tracking-[0.3em]`}
              />
              <FieldError message={fieldErrors.otp} />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                {t("newPassword")}
              </label>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearField("newPassword");
                }}
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.newPassword)}
                className={inputClass(Boolean(fieldErrors.newPassword))}
              />
              <p className="mt-1 text-xs text-slate-400">
                {t("minChars").replace("{n}", String(minLength))}
              </p>
              <FieldError message={fieldErrors.newPassword} />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                {t("confirmNewPassword")}
              </label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearField("confirmPassword");
                }}
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                className={inputClass(Boolean(fieldErrors.confirmPassword))}
              />
              <FieldError message={fieldErrors.confirmPassword} />
            </div>

            {formError ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
                {formError}
              </p>
            ) : null}
            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                <p className="font-semibold text-emerald-800">{success}</p>
                <p className="mt-1 text-xs text-emerald-700">
                  Redirecting you to the login page…
                </p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy || Boolean(success)}
              className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? t("saving") : t("setNewPasswordBtn")}
            </button>
            <button
              type="button"
              onClick={requestOtp}
              disabled={busy || Boolean(success)}
              className="w-full text-center text-xs font-semibold text-slate-400 transition hover:text-emerald-700 disabled:opacity-50"
            >
              {t("resendOtp")}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
                setFieldErrors({});
                setFormError(null);
                setSuccess(null);
              }}
              disabled={busy || Boolean(success)}
              className="w-full text-center text-xs font-semibold text-slate-400 transition hover:text-emerald-700 disabled:opacity-50"
            >
              {t("forgotChangeIdentifier")}
            </button>
          </>
        )}

        <p className="text-center text-xs">
          <Link
            href="/login"
            className="font-semibold text-emerald-700 hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </form>
    </div>
  );
}
