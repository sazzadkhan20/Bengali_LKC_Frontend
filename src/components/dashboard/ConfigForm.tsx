"use client";

import { useMemo, useState } from "react";
import type { SystemConfig } from "@/lib/types";
import { formatDateTime, timeAgo } from "@/lib/format";

export interface ConfigHistoryItem {
  at: string | null;
  by: string | null;
  detail: string | null;
}

export interface ConfigView {
  config: SystemConfig;
  meta: {
    updatedAt: string | null;
    history: ConfigHistoryItem[];
    captchaProvider: "RECAPTCHA_V3" | "CHECKBOX";
  };
}

type NumKey = Exclude<keyof SystemConfig, "captchaEnabled" | "honeypotEnabled">;
type BoolKey = "captchaEnabled" | "honeypotEnabled";

type Field =
  | { kind: "number"; key: NumKey; label: string; hint: string; unit?: string; min: number; max: number; step?: number }
  | { kind: "bool"; key: BoolKey; label: string; hint: string };

const SECTIONS: { id: string; title: string; subtitle: string; fields: Field[] }[] = [
  {
    id: "limits",
    title: "Submission limits & suspension",
    subtitle: "Caps on how many entries a contributor can create. Platform Architect and System Moderator entries are exempt.",
    fields: [
      { kind: "number", key: "maxEntriesPerSession", label: "Max entries per session", hint: "Counted from the user's latest sign-in.", unit: "entries", min: 1, max: 10_000 },
      { kind: "number", key: "maxEntriesPerDay", label: "Max entries per 24 hours", hint: "Rolling 24-hour window. Must be at least the session limit.", unit: "entries", min: 1, max: 100_000 },
      { kind: "number", key: "suspensionThreshold", label: "Suspension threshold", hint: "Accepted entries plus attempts blocked by a limit within 24 hours. Reaching it suspends the account until the Platform Architect reinstates it.", unit: "attempts", min: 2, max: 1_000_000 },
    ],
  },
  {
    id: "antibot",
    title: "Anti-bot controls",
    subtitle: "Checks applied to every Quick Input submission from contributors and reviewers.",
    fields: [
      { kind: "bool", key: "captchaEnabled", label: "CAPTCHA challenge", hint: "Required before each submission and resubmission." },
      { kind: "number", key: "captchaScoreThreshold", label: "CAPTCHA score threshold", hint: "reCAPTCHA v3 scores below this are rejected (0 = allow all, 1 = strictest).", min: 0, max: 1, step: 0.05 },
      { kind: "bool", key: "honeypotEnabled", label: "Honeypot fields", hint: "Hidden form fields that silently discard bot submissions." },
      { kind: "number", key: "minSubmissionSeconds", label: "Minimum completion time", hint: "Entries completed faster are held UNDER_REVIEW for a System Moderator.", unit: "seconds", min: 0, max: 600 },
      { kind: "number", key: "anomalyThresholdPerHour", label: "Anomaly alert threshold", hint: "An account creating this many entries within 60 minutes alerts the System Moderator; its further entries are held UNDER_REVIEW.", unit: "per hour", min: 1, max: 100_000 },
    ],
  },
  {
    id: "access",
    title: "Access & sessions",
    subtitle: "Request throttling, session lifetime and password policy.",
    fields: [
      { kind: "number", key: "ipRequestsPerMinute", label: "Request rate limit", hint: "Per signed-in user, or per IP address for visitors.", unit: "per minute", min: 30, max: 100_000 },
      { kind: "number", key: "sessionTimeoutMinutes", label: "Session timeout", hint: "Signed-in sessions expire after this much inactivity.", unit: "minutes", min: 5, max: 1_440 },
      { kind: "number", key: "passwordMinLength", label: "Password minimum length", hint: "Applies to new passwords and one-time credentials.", unit: "characters", min: 8, max: 128 },
    ],
  },
  {
    id: "leaderboard",
    title: "Leader Board",
    subtitle: "Points and tiers for Contributors, Lexical Editors and Chief Lexical Editors.",
    fields: [
      { kind: "number", key: "rewardPointPerEntry", label: "Points per validated entry", hint: "Same value for every ranked role.", unit: "points", min: 1, max: 1_000 },
      { kind: "number", key: "tierBronzeMin", label: "Bronze tier from", hint: "Minimum cumulative points.", unit: "points", min: 1, max: 10_000_000 },
      { kind: "number", key: "tierSilverMin", label: "Silver tier from", hint: "Must be above Bronze.", unit: "points", min: 1, max: 10_000_000 },
      { kind: "number", key: "tierGoldMin", label: "Gold tier from", hint: "Must be above Silver.", unit: "points", min: 1, max: 10_000_000 },
    ],
  },
];

const NUMBER_FIELDS = SECTIONS.flatMap((s) => s.fields).filter(
  (f): f is Extract<Field, { kind: "number" }> => f.kind === "number"
);

type Draft = Record<NumKey, string> & Record<BoolKey, boolean>;

function toDraft(c: SystemConfig): Draft {
  const d = { captchaEnabled: c.captchaEnabled, honeypotEnabled: c.honeypotEnabled } as Draft;
  for (const f of NUMBER_FIELDS) d[f.key] = String(c[f.key]);
  return d;
}

function validate(d: Draft): Partial<Record<keyof SystemConfig, string>> {
  const errors: Partial<Record<keyof SystemConfig, string>> = {};
  const n: Partial<Record<NumKey, number>> = {};
  for (const f of NUMBER_FIELDS) {
    const raw = d[f.key].trim();
    const v = Number(raw);
    if (raw === "" || !Number.isFinite(v)) {
      errors[f.key] = "Enter a number.";
      continue;
    }
    if (f.key !== "captchaScoreThreshold" && !Number.isInteger(v)) {
      errors[f.key] = "Enter a whole number.";
      continue;
    }
    if (v < f.min || v > f.max) {
      errors[f.key] = `Must be between ${f.min.toLocaleString("en-US")} and ${f.max.toLocaleString("en-US")}.`;
      continue;
    }
    n[f.key] = v;
  }
  const has = (k: NumKey) => n[k] !== undefined;
  if (has("maxEntriesPerDay") && has("maxEntriesPerSession") && n.maxEntriesPerDay! < n.maxEntriesPerSession!) {
    errors.maxEntriesPerDay = `Must be at least the session limit (${n.maxEntriesPerSession}).`;
  }
  if (has("suspensionThreshold") && has("maxEntriesPerDay") && n.suspensionThreshold! <= n.maxEntriesPerDay!) {
    errors.suspensionThreshold = `Must be greater than the daily limit (${n.maxEntriesPerDay}), otherwise normal use would suspend accounts.`;
  }
  if (has("tierSilverMin") && has("tierBronzeMin") && n.tierSilverMin! <= n.tierBronzeMin!) {
    errors.tierSilverMin = `Must be greater than the Bronze threshold (${n.tierBronzeMin}).`;
  }
  if (has("tierGoldMin") && has("tierSilverMin") && n.tierGoldMin! <= n.tierSilverMin!) {
    errors.tierGoldMin = `Must be greater than the Silver threshold (${n.tierSilverMin}).`;
  }
  return errors;
}

function toPayload(d: Draft): SystemConfig {
  const out = { captchaEnabled: d.captchaEnabled, honeypotEnabled: d.honeypotEnabled } as SystemConfig;
  for (const f of NUMBER_FIELDS) (out[f.key] as number) = Number(d[f.key]);
  return out;
}

export function ConfigForm({ initial }: { initial: ConfigView }) {
  const [view, setView] = useState<ConfigView>(initial);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial.config));
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof SystemConfig, string>>>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[] | null>(null);

  const baseline = useMemo(() => toDraft(view.config), [view.config]);
  const dirtyKeys = (Object.keys(draft) as (keyof Draft)[]).filter((k) =>
    typeof draft[k] === "boolean" ? draft[k] !== baseline[k] : Number(draft[k]) !== Number(baseline[k]) || String(draft[k]).trim() === ""
  );
  const clientErrors = validate(draft);
  const errors = { ...(touched ? clientErrors : {}), ...serverErrors };
  const recaptcha = view.meta.captchaProvider === "RECAPTCHA_V3";

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setServerErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
    setSaved(null);
    setFormError(null);
  }

  async function save() {
    setTouched(true);
    if (Object.keys(clientErrors).length > 0) {
      setFormError("Fix the highlighted settings before saving.");
      return;
    }
    setBusy(true);
    setFormError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(draft)),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string>;
        changed?: string[];
        config?: SystemConfig;
        meta?: ConfigView["meta"];
      };
      if (!res.ok) {
        if (data.errors) setServerErrors(data.errors as Partial<Record<keyof SystemConfig, string>>);
        setFormError(data.error ?? (data.errors ? "Fix the highlighted settings before saving." : "The configuration could not be saved."));
        return;
      }
      if (data.config && data.meta) {
        setView({ config: data.config, meta: data.meta });
        setDraft(toDraft(data.config));
      }
      setServerErrors({});
      setTouched(false);
      setSaved(data.changed ?? []);
    } catch {
      setFormError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    setDraft(toDraft(view.config));
    setServerErrors({});
    setTouched(false);
    setFormError(null);
    setSaved(null);
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      {saved ? (
        <div role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          {saved.length === 0 ? (
            <p className="font-semibold">No changes to save.</p>
          ) : (
            <>
              <p className="font-semibold">
                ✓ Saved {saved.length} change{saved.length === 1 ? "" : "s"}. They apply immediately and are recorded in the audit trail.
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
                {saved.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`cfg-${section.id}`} className="rounded-2xl border border-slate-200 bg-white">
          <header className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h2 id={`cfg-${section.id}`} className="text-sm font-bold text-slate-900">
                {section.title}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{section.subtitle}</p>
            </div>
            {section.id === "antibot" ? (
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
                  recaptcha ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"
                }`}
              >
                <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${recaptcha ? "bg-emerald-500" : "bg-amber-500"}`} />
                {recaptcha ? "reCAPTCHA v3 active" : "Checkbox CAPTCHA (reCAPTCHA keys not set)"}
              </span>
            ) : null}
          </header>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
            {section.fields.map((f) => {
              const error = errors[f.key];
              const changed = dirtyKeys.includes(f.key);
              const inactive = f.key === "captchaScoreThreshold" && (!recaptcha || !draft.captchaEnabled);
              const id = `cfg-field-${f.key}`;
              return (
                <div key={f.key} className="flex flex-col bg-white px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <label htmlFor={id} className="text-sm font-semibold text-slate-700">
                      {f.label}
                      {changed ? (
                        <span className="ml-2 rounded-full bg-sky-50 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-sky-700 ring-1 ring-inset ring-sky-200">
                          Edited
                        </span>
                      ) : null}
                    </label>
                    {f.kind === "bool" ? (
                      <button
                        id={id}
                        type="button"
                        role="switch"
                        aria-checked={draft[f.key]}
                        onClick={() => update(f.key, !draft[f.key])}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${
                          draft[f.key] ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span className="sr-only">{draft[f.key] ? "On" : "Off"}</span>
                        <span
                          aria-hidden
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                            draft[f.key] ? "translate-x-5.5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{f.hint}</p>
                  {f.kind === "number" ? (
                    <div className="mt-2.5">
                      <div
                        className={`flex items-center overflow-hidden rounded-lg border bg-white focus-within:ring-2 ${
                          error
                            ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-200"
                            : "border-slate-300 focus-within:border-emerald-500 focus-within:ring-emerald-200"
                        }`}
                      >
                        <input
                          id={id}
                          type="number"
                          inputMode={f.step ? "decimal" : "numeric"}
                          min={f.min}
                          max={f.max}
                          step={f.step ?? 1}
                          value={draft[f.key]}
                          onChange={(e) => update(f.key, e.target.value)}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${id}-error` : undefined}
                          className="w-full min-w-0 bg-transparent px-3 py-2 text-sm tabular-nums text-slate-800 outline-none"
                        />
                        {f.unit ? (
                          <span className="shrink-0 border-l border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                            {f.unit}
                          </span>
                        ) : null}
                      </div>
                      {error ? (
                        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
                          {error}
                        </p>
                      ) : inactive ? (
                        <p className="mt-1.5 text-xs text-amber-700">
                          {draft.captchaEnabled
                            ? "Not applied until RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY are set on the backend."
                            : "Not applied while the CAPTCHA challenge is off."}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {formError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200">
          {formError}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-end gap-3">
          <span className="mr-auto text-xs text-slate-500">
            {dirtyKeys.length > 0
              ? `${dirtyKeys.length} unsaved change${dirtyKeys.length === 1 ? "" : "s"}`
              : view.meta.updatedAt
                ? `Last updated ${timeAgo(view.meta.updatedAt)}`
                : "No unsaved changes"}
          </span>
          <button
            type="button"
            onClick={discard}
            disabled={busy || dirtyKeys.length === 0}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || dirtyKeys.length === 0}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <section aria-labelledby="cfg-history" className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 id="cfg-history" className="text-sm font-bold text-slate-900">
            Recent changes
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">The last five configuration updates. The full history is in the Audit Log.</p>
        </header>
        {view.meta.history.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400 sm:px-5">No configuration changes recorded yet.</p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {view.meta.history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="px-4 py-3 sm:px-5">
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{h.by ?? "Unknown"}</span>
                  {h.at ? (
                    <>
                      {" · "}
                      <time dateTime={h.at} title={formatDateTime(h.at)}>
                        {timeAgo(h.at)}
                      </time>
                    </>
                  ) : null}
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {(h.detail ?? "").split("; ").filter(Boolean).map((c) => (
                    <li key={c} className="break-words">
                      {c}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
