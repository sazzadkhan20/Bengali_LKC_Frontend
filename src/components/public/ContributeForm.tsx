"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";

function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}

const collapse = (v: string) => v.trim().replace(/\s+/g, " ");

/** Mirrors the backend rules in ApplicationService.submit so errors match before and after sending. */
const applicationSchema = z.object({
  name: z
    .string()
    .transform(collapse)
    .pipe(z.string().min(2, "Please enter your full name.").max(80, "Name must be at most 80 characters.")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email address is required.")
    .max(120, "Enter a valid email address.")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address."),
  phone: z
    .string()
    .transform(collapse)
    .pipe(
      z
        .string()
        .min(1, "Phone number is required.")
        .regex(/^[+0-9()\-.\s]{6,30}$/, "Enter a reachable phone number (digits, spaces, + - ( ) only).")
        .refine(
          (v) => v.replace(/\D/g, "").length >= 6,
          "Enter a reachable phone number (digits, spaces, + - ( ) only)."
        )
    ),
  dob: z
    .string()
    .min(1, "Date of birth is required.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date of birth.")
    .refine((v) => v < dhakaToday(), "Date of birth must be in the past.")
    .refine((v) => Number(v.slice(0, 4)) > Number(dhakaToday().slice(0, 4)) - 120, "Enter a valid date of birth."),
  institution: z
    .string()
    .transform(collapse)
    .pipe(
      z
        .string()
        .min(1, "Institution or affiliation is required.")
        .max(120, "Institution must be at most 120 characters.")
    ),
  occupation: z
    .string()
    .transform(collapse)
    .pipe(z.string().min(1, "Occupation is required.").max(80, "Occupation must be at most 80 characters.")),
  interestRole: z.enum(["", "CONTRIBUTOR", "LEXICAL_EDITOR", "CHIEF_LEXICAL_EDITOR", "ARBITRATION_CURATOR", "OTHER"], {
    error: "Select one of the listed roles.",
  }),
  message: z
    .string()
    .trim()
    .min(20, "Please explain why you want to join (at least 20 characters).")
    .max(800, "Message must be at most 800 characters."),
});

type FieldName = keyof typeof applicationSchema.shape;
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER = Object.keys(applicationSchema.shape) as FieldName[];

function validateField(field: FieldName, value: string): string | undefined {
  const result = applicationSchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

function validateAll(values: Record<FieldName, string>) {
  const result = applicationSchema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} as FieldErrors };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as FieldName;
    if (!errors[key]) errors[key] = issue.message;
  }
  return { data: null, errors };
}

const EMPTY_VALUES: Record<FieldName, string> = {
  name: "",
  email: "",
  phone: "",
  dob: "",
  institution: "",
  occupation: "",
  interestRole: "",
  message: "",
};

const inputBase =
  "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2";
const inputOk = "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200";
const inputBad = "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-200";

export function ContributeForm() {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<FieldName, string>>(EMPTY_VALUES);
  const [honeypot, setHoneypot] = useState("");
  const [today] = useState(dhakaToday);
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

  function showFieldError(field: FieldName, message: string | undefined) {
    if (fieldErrors[field] === message) return;
    const next = { ...fieldErrors };
    if (message) next[field] = message;
    else delete next[field];
    setFieldErrors(next);
    if (Object.keys(next).length === 0) setError(null);
  }

  function set(field: FieldName, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    showFieldError(field, validateField(field, value));
  }

  function blur(field: FieldName) {
    showFieldError(field, validateField(field, values[field]));
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
    const { data, errors } = validateAll(values);
    if (!data) {
      setFieldErrors(errors);
      setError(t("contributeFixFields"));
      focusFirst(errors);
      return;
    }
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, honeypot }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: FieldErrors };
      if (!res.ok) {
        if (body.errors && Object.keys(body.errors).length > 0) {
          setFieldErrors(body.errors);
          setError(t("contributeFixFields"));
          focusFirst(body.errors);
        } else {
          setError(body.error ?? t("contributeFailed"));
        }
        return;
      }
      setDone(true);
      setValues(EMPTY_VALUES);
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
    onBlur: () => blur(f),
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
      {/* Spam trap: the name and ignore flags keep browser autofill and password managers out of it. */}
      <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contribute-lkc-trap">Leave this field empty</label>
        <input
          id="contribute-lkc-trap"
          type="text"
          tabIndex={-1}
          name="lkc_trap_field"
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          data-form-type="other"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

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
          {label("dob", t("dateOfBirth"), true)}
          <input
            {...a11y("dob")}
            required
            type="date"
            autoComplete="bday"
            value={values.dob}
            max={today}
            onChange={(e) => set("dob", e.target.value)}
            className={`${cls("dob")} bg-white`}
          />
          {fieldError("dob")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          {label("institution", t("institution"), true)}
          <input
            {...a11y("institution")}
            required
            autoComplete="organization"
            value={values.institution}
            onChange={(e) => set("institution", e.target.value)}
            maxLength={120}
            className={cls("institution")}
            placeholder="University, academy, or organisation"
          />
          {fieldError("institution")}
        </div>
        <div>
          {label("occupation", t("occupation"), true)}
          <input
            {...a11y("occupation")}
            required
            autoComplete="organization-title"
            value={values.occupation}
            onChange={(e) => set("occupation", e.target.value)}
            maxLength={80}
            className={cls("occupation")}
            placeholder="e.g. Lecturer, Linguist, Student"
          />
          {fieldError("occupation")}
        </div>
      </div>
      <p className="-mt-2 text-xs text-slate-500">{t("authorDetailsHint")}</p>

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
