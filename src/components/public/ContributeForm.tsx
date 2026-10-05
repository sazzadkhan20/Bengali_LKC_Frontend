"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

type FieldName = "name" | "email" | "phone" | "institution" | "interestRole" | "message";
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = ["name", "email", "phone", "institution", "interestRole", "message"];

const inputBase =
  "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2";
const inputOk = "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200";
const inputBad = "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-200";

export function ContributeForm() {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: "",
    email: "",
    phone: "",
    institution: "",
    interestRole: "",
    message: "",
  });
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const interestRoles = [
    { value: "", label: t("interestNotSure") },
    { value: "CONTRIBUTOR", label: t("interestContributor") },
    { value: "LEXICAL_EDITOR", label: t("interestEditor") },
    { value: "CHIEF_LEXICAL_EDITOR", label: t("interestChief") },
    { value: "ARBITRATION_CURATOR", label: t("interestCurator") },
    { value: "OTHER", label: t("interestOther") },
  ];

  function set(field: FieldName, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((e) => {
        const next = { ...e };
        delete next[field];
        return next;
      });
    }
  }

  function focusFirst(errors: FieldErrors) {
    const first = FIELD_ORDER.find((f) => errors[f]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          institution: values.institution.trim(),
          interestRole: values.interestRole,
          message: values.message.trim(),
          honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: FieldErrors };
      if (!res.ok) {
        if (data.errors && Object.keys(data.errors).length > 0) {
          setFieldErrors(data.errors);
          setError(t("contributeFixFields"));
          focusFirst(data.errors);
        } else {
          setError(data.error ?? t("contributeFailed"));
        }
        return;
      }
      setDone(true);
      setValues({ name: "", email: "", phone: "", institution: "", interestRole: "", message: "" });
    } catch {
      setError(t("contributeFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
        <p className="text-lg font-bold text-emerald-900">{t("thankYouTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-emerald-800">{t("thankYouBody")}</p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          {t("submitAnother")}
        </button>
      </div>
    );
  }

  const cls = (f: FieldName) => `${inputBase} ${fieldErrors[f] ? inputBad : inputOk}`;
  const a11y = (f: FieldName) => ({
    name: f,
    id: `contribute-${f}`,
    "aria-invalid": fieldErrors[f] ? true : undefined,
    "aria-describedby": fieldErrors[f] ? `contribute-${f}-error` : undefined,
  });
  const fieldError = (f: FieldName) =>
    fieldErrors[f] ? (
      <p id={`contribute-${f}-error`} className="mt-1 text-xs font-medium text-red-600">
        {fieldErrors[f]}
      </p>
    ) : null;
  const label = (f: FieldName, text: string, required = false) => (
    <label htmlFor={`contribute-${f}`} className="mb-1.5 block text-sm font-semibold text-slate-700">
      {text} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
      <input
        tabIndex={-1}
        autoComplete="off"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden
      />

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          {label("name", t("fullName"), true)}
          <input
            {...a11y("name")}
            required
            autoComplete="name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={80}
            className={cls("name")}
            placeholder="e.g. Nusrat Jahan"
          />
          {fieldError("name")}
        </div>
        <div>
          {label("email", t("email"), true)}
          <input
            {...a11y("email")}
            required
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            maxLength={120}
            className={cls("email")}
            placeholder="you@university.edu"
          />
          {fieldError("email")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          {label("phone", t("phone"), true)}
          <input
            {...a11y("phone")}
            required
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            maxLength={30}
            className={cls("phone")}
            placeholder="+880 1XXX-XXXXXX"
          />
          {fieldError("phone")}
        </div>
        <div>
          {label("institution", t("institution"))}
          <input
            {...a11y("institution")}
            autoComplete="organization"
            value={values.institution}
            onChange={(e) => set("institution", e.target.value)}
            maxLength={120}
            className={cls("institution")}
            placeholder="University, academy, or organisation"
          />
          {fieldError("institution")}
        </div>
      </div>

      <div>
        {label("interestRole", t("interestRole"))}
        <select
          {...a11y("interestRole")}
          value={values.interestRole}
          onChange={(e) => set("interestRole", e.target.value)}
          className={`${cls("interestRole")} bg-white`}
        >
          {interestRoles.map((r) => (
            <option key={r.value || "none"} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {fieldError("interestRole")}
      </div>

      <div>
        {label("message", t("whyJoin"), true)}
        <textarea
          {...a11y("message")}
          required
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          rows={5}
          maxLength={800}
          placeholder={t("whyJoinPlaceholder")}
          className={cls("message")}
        />
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">{fieldError("message")}</div>
          <p
            className={`shrink-0 text-[11px] ${
              values.message.trim().length > 0 && values.message.trim().length < 20 ? "text-red-500" : "text-slate-400"
            }`}
          >
            {values.message.length}/800
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50 sm:w-auto"
      >
        {busy ? t("sending") : t("submitRequest")}
      </button>
    </form>
  );
}
