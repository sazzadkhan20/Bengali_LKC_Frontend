"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { POS } from "@/lib/types";
import { formatNumber } from "@/lib/format";

const POS_OPTIONS: { value: POS; label: string }[] = [
  { value: "n", label: "Nouns" },
  { value: "v", label: "Verbs" },
  { value: "a", label: "Adjectives" },
  { value: "r", label: "Adverbs" },
];

export type ExportScope = "new" | "all" | "xml" | "range";

export interface ExportPanelProps {
  pendingNew: number;
  baselineAt: string | null;
  baselineExportId: string | null;
  today: string;
  firstPlatformDate: string | null;
}

interface DryRunResult {
  scope: ExportScope;
  projected: { entries: number; senses: number; synsets: number; crowdsourced: number };
  window: { baselineAt: string | null; cutoffAt: string; from: string | null; to: string | null };
  filename: string;
}

type FieldErrors = Partial<Record<"scope" | "version" | "pos" | "from" | "to", string>>;

const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$/;

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dhakaDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function filenameFrom(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export function ExportPanel({ pendingNew, baselineAt, baselineExportId, today, firstPlatformDate }: ExportPanelProps) {
  const router = useRouter();
  const [scope, setScope] = useState<ExportScope>(pendingNew > 0 ? "new" : "all");
  const [version, setVersion] = useState("1.1");
  const [pos, setPos] = useState<POS[]>([]);
  const [from, setFrom] = useState(shiftDate(today, -6));
  const [to, setTo] = useState(today);
  const [lkcSource, setLkcSource] = useState(true);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<{ filename: string; sha: string; size: number } | null>(null);
  const [busy, setBusy] = useState<"dry" | "export" | null>(null);

  const scopes: { value: ExportScope; title: string; desc: string; badge?: string }[] = [
    {
      value: "new",
      title: "New since last export",
      desc: baselineAt
        ? `Platform entries validated after ${baselineExportId} (${dhakaDateTime(baselineAt)}).`
        : "No full or incremental export yet — includes every validated platform entry.",
      badge: `${formatNumber(pendingNew)} pending`,
    },
    {
      value: "all",
      title: "All data",
      desc: "Original lexicon plus every validated platform entry — the complete UKC-ready file.",
    },
    {
      value: "xml",
      title: "Original XML only",
      desc: "Only the imported Bangla_Mono_Lingual_Lexicons data, without platform additions.",
    },
    {
      value: "range",
      title: "Custom date range",
      desc: "Platform entries validated between two dates (Bangladesh time).",
    },
  ];

  const reset = () => {
    setDryRun(null);
    setMessage(null);
    setDone(null);
  };

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!VERSION_RE.test(version.trim())) {
      e.version = "Use 1–40 letters, digits, dots, hyphens or underscores (e.g. 1.2).";
    }
    if (scope === "range") {
      if (!from) e.from = "Choose a start date.";
      else if (from > today) e.from = "The start date cannot be in the future.";
      if (!to) e.to = "Choose an end date.";
      else if (from && to < from) e.to = "The end date must be on or after the start date.";
    }
    return e;
  };

  const qs = () => {
    const p = new URLSearchParams({ scope, version: version.trim() });
    if (pos.length) p.set("pos", pos.join(","));
    if (scope === "range") {
      p.set("from", from);
      p.set("to", to);
    }
    if (lkcSource) p.set("lkcSource", "1");
    return p.toString();
  };

  async function readError(res: Response): Promise<void> {
    const data = (await res.json().catch(() => ({}))) as { errors?: FieldErrors & Record<string, string>; error?: string };
    if (data.errors) {
      setErrors(data.errors);
      setMessage(data.errors.scope ?? "Please correct the highlighted fields.");
    } else if (res.status === 403) {
      setMessage("You no longer have permission to export. Sign in again.");
    } else {
      setMessage(data.error ?? "The export service is unavailable. Please try again.");
    }
  }

  async function runDry() {
    reset();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy("dry");
    try {
      const res = await fetch(`/api/export?dryRun=1&${qs()}`, { cache: "no-store" });
      if (res.ok) setDryRun((await res.json()) as DryRunResult);
      else await readError(res);
    } catch {
      setMessage("Network error — the dry run did not complete.");
    } finally {
      setBusy(null);
    }
  }

  async function runExport() {
    reset();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy("export");
    try {
      const res = await fetch(`/api/export?${qs()}`, { cache: "no-store" });
      if (!res.ok) {
        await readError(res);
        return;
      }
      const blob = await res.blob();
      const name = filenameFrom(res.headers.get("content-disposition"), "Bangla_Mono_Lingual_Lexicons.xml");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setDone({ filename: name, sha: res.headers.get("x-export-sha256") ?? "", size: blob.size });
      router.refresh();
    } catch {
      setMessage("Network error — the export did not complete.");
    } finally {
      setBusy(null);
    }
  }

  const presets = [
    { label: "Today", from: today, to: today },
    { label: "Last 7 days", from: shiftDate(today, -6), to: today },
    { label: "Last 30 days", from: shiftDate(today, -29), to: today },
    { label: "This month", from: `${today.slice(0, 8)}01`, to: today },
  ];
  const newBlocked = scope === "new" && pendingNew === 0;
  const input = (err?: string) =>
    `w-full min-w-0 rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 ${
      err ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
    }`;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">Export scope</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {scopes.map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                scope === o.value
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >
              <input
                type="radio"
                name="exportScope"
                value={o.value}
                checked={scope === o.value}
                onChange={() => {
                  setScope(o.value);
                  setErrors({});
                  reset();
                }}
                className="mt-1 h-4 w-4 shrink-0 accent-emerald-700"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
                  {o.title}
                  {o.badge ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${
                        pendingNew > 0 ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"
                      }`}
                    >
                      {o.badge}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">{o.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {scope === "range" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const active = from === p.from && to === p.to;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setFrom(p.from);
                    setTo(p.to);
                    setErrors({});
                    reset();
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                    active ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="export-from" className="mb-1.5 block text-xs font-semibold text-slate-600">
                Validated from
              </label>
              <input
                id="export-from"
                type="date"
                value={from}
                max={today}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setErrors((x) => ({ ...x, from: undefined, to: undefined }));
                  reset();
                }}
                aria-invalid={Boolean(errors.from)}
                className={input(errors.from)}
              />
              {errors.from ? <p className="mt-1 text-xs font-medium text-red-600">{errors.from}</p> : null}
            </div>
            <div>
              <label htmlFor="export-to" className="mb-1.5 block text-xs font-semibold text-slate-600">
                Validated to (inclusive)
              </label>
              <input
                id="export-to"
                type="date"
                value={to}
                min={from || undefined}
                max={today}
                onChange={(e) => {
                  setTo(e.target.value);
                  setErrors((x) => ({ ...x, to: undefined }));
                  reset();
                }}
                aria-invalid={Boolean(errors.to)}
                className={input(errors.to)}
              />
              {errors.to ? <p className="mt-1 text-xs font-medium text-red-600">{errors.to}</p> : null}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {firstPlatformDate
              ? `The first platform entry was validated on ${firstPlatformDate}.`
              : "No platform entries have been validated yet."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="export-version" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Version string <span className="font-normal text-slate-400">(Lexicon version)</span>
          </label>
          <input
            id="export-version"
            value={version}
            maxLength={40}
            onChange={(e) => {
              setVersion(e.target.value);
              setErrors((x) => ({ ...x, version: undefined }));
              reset();
            }}
            aria-invalid={Boolean(errors.version)}
            className={`${input(errors.version)} font-mono`}
          />
          {errors.version ? <p className="mt-1 text-xs font-medium text-red-600">{errors.version}</p> : null}
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            Parts of speech <span className="font-normal text-slate-400">(none selected = all)</span>
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {POS_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={pos.includes(o.value)}
                onClick={() => {
                  setPos((p) => (p.includes(o.value) ? p.filter((x) => x !== o.value) : [...p, o.value]));
                  reset();
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                  pos.includes(o.value)
                    ? "bg-emerald-700 text-white ring-emerald-700"
                    : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {errors.pos ? <p className="mt-1 text-xs font-medium text-red-600">{errors.pos}</p> : null}
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={lkcSource}
          onChange={(e) => {
            setLkcSource(e.target.checked);
            reset();
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700"
        />
        <span>
          Credit the Bengali LKC Framework in <code className="font-mono text-xs">dc:source</code>
        </span>
      </label>

      {dryRun ? (
        dryRun.projected.senses === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-bold">Nothing to export</p>
            <p className="mt-0.5 text-xs">
              No entries match this scope{pos.length ? " and these parts of speech" : ""}. Choose another scope or date range.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <p className="font-bold">Dry-run projection</p>
            <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Lexical entries", dryRun.projected.entries],
                ["Senses", dryRun.projected.senses],
                ["Synsets", dryRun.projected.synsets],
                ["Platform senses", dryRun.projected.crowdsourced],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white/70 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{label}</dt>
                  <dd className="text-lg font-bold tabular-nums">{formatNumber(Number(value))}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 break-all text-xs">
              File: <span className="font-mono">{dryRun.filename}</span> · Nothing was generated or logged.
            </p>
          </div>
        )
      ) : null}

      {message ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {message}
        </div>
      ) : null}

      {done ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-bold">Export generated and logged</p>
          <p className="mt-0.5 break-all text-xs">
            <span className="font-mono">{done.filename}</span> · {formatNumber(Math.max(1, Math.round(done.size / 1024)))} KB
          </p>
          {done.sha ? <p className="mt-0.5 break-all font-mono text-[11px] text-emerald-800">SHA-256 {done.sha}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={runDry}
          disabled={busy !== null}
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "dry" ? "Counting…" : "Dry run"}
        </button>
        <button
          type="button"
          onClick={runExport}
          disabled={busy !== null || newBlocked}
          className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "export" ? "Generating…" : "⇩ Generate & download XML"}
        </button>
        <p className="text-[11px] text-slate-500 sm:flex-1">
          {newBlocked
            ? "Nothing new has been validated since the last export."
            : "Each download is fingerprinted with SHA-256 and permanently logged."}
        </p>
      </div>
    </div>
  );
}
