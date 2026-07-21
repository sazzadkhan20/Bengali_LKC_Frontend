"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SystemConfig } from "@/lib/types";

const FIELDS: {
  key: keyof SystemConfig;
  label: string;
  hint: string;
  type: "number" | "boolean";
}[] = [
  { key: "maxEntriesPerSession", label: "Max entries per session", hint: "Single login window (default 50)", type: "number" },
  { key: "maxEntriesPerDay", label: "Max entries per 24-hour window", hint: "Rolling daily cap (default 200)", type: "number" },
  { key: "suspensionThreshold", label: "Suspension trigger threshold", hint: "Entries in any window before auto-suspension (default 500)", type: "number" },
  { key: "minSubmissionSeconds", label: "Minimum submission time (s)", hint: "Faster submissions are flagged UNDER_REVIEW (default 10)", type: "number" },
  { key: "anomalyThresholdPerHour", label: "Anomaly alert threshold (/hr)", hint: "Real-time System Moderator alert (default 100)", type: "number" },
  { key: "ipRequestsPerMinute", label: "Unauthenticated IP rate limit (/min)", hint: "Public endpoint protection (default 10)", type: "number" },
  { key: "sessionTimeoutMinutes", label: "Inactive session timeout (min)", hint: "Sessions expire after inactivity (default 60)", type: "number" },
  { key: "passwordMinLength", label: "Password minimum length", hint: "Credential/password policy (SRS §3.2, default 10)", type: "number" },
  { key: "rewardPointPerEntry", label: "Reward points per validated entry", hint: "Leader Board point value, identical for all ranked roles (SRS §7.8)", type: "number" },
  { key: "tierGoldMin", label: "Gold tier threshold", hint: "Minimum cumulative points for Gold (default 500)", type: "number" },
  { key: "tierSilverMin", label: "Silver tier threshold", hint: "Minimum cumulative points for Silver (default 200)", type: "number" },
  { key: "tierBronzeMin", label: "Bronze tier threshold", hint: "Minimum cumulative points for Bronze (default 50)", type: "number" },
  { key: "captchaScoreThreshold", label: "CAPTCHA score threshold", hint: "reCAPTCHA v3 minimum score (0–1)", type: "number" },
  { key: "captchaEnabled", label: "CAPTCHA challenge", hint: "Required before every Quick Input submission", type: "boolean" },
  { key: "honeypotEnabled", label: "Honeypot fields", hint: "Hidden form fields that trap bots (silent rejection)", type: "boolean" },
];

export function ConfigForm({ initial }: { initial: SystemConfig }) {
  const router = useRouter();
  const [config, setConfig] = useState<SystemConfig>(initial);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      {saved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
          ✓ Configuration saved and logged to the audit trail.
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div
            key={f.key}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <label className="block text-sm font-semibold text-slate-700">
              {f.label}
            </label>
            <p className="mt-0.5 text-xs text-slate-400">{f.hint}</p>
            {f.type === "number" ? (
              <input
                type="number"
                step={f.key === "captchaScoreThreshold" ? 0.1 : 1}
                value={config[f.key] as number}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    [f.key]: parseFloat(e.target.value) || 0,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            ) : (
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({ ...c, [f.key]: !c[f.key] }))
                }
                className={`mt-2 inline-flex h-7 w-13 items-center rounded-full px-0.5 transition ${
                  config[f.key] ? "bg-emerald-600" : "bg-slate-300"
                }`}
                aria-pressed={Boolean(config[f.key])}
              >
                <span
                  className={`h-6 w-6 transform rounded-full bg-white shadow transition ${
                    config[f.key] ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={busy}
        className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save Configuration"}
      </button>
    </div>
  );
}
