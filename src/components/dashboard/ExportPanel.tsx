"use client";

import { useState } from "react";
import type { POS } from "@/lib/types";

const POS_OPTIONS: { value: POS; label: string }[] = [
  { value: "n", label: "Nouns" },
  { value: "v", label: "Verbs" },
  { value: "a", label: "Adjectives" },
  { value: "r", label: "Adverbs" },
];

interface DryRunResult {
  projected: { entries: number; crowdsourced: number; synsets: number };
}

export function ExportPanel() {
  const [version, setVersion] = useState("1.1");
  const [pos, setPos] = useState<POS[]>([]);
  const [includeCanonical, setIncludeCanonical] = useState(true);
  const [lkcSource, setLkcSource] = useState(true);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [busy, setBusy] = useState(false);

  const qs = () => {
    const p = new URLSearchParams();
    p.set("version", version);
    if (pos.length) p.set("pos", pos.join(","));
    p.set("canonical", includeCanonical ? "1" : "0");
    if (lkcSource) p.set("lkcSource", "1");
    return p.toString();
  };

  async function runDry() {
    setBusy(true);
    try {
      const res = await fetch(`/api/export?dryRun=1&${qs()}`);
      if (res.ok) setDryRun(await res.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Export version string (dc:version)
          </label>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            POS categories <span className="font-normal text-slate-400">(empty = all)</span>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {POS_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  setPos((p) =>
                    p.includes(o.value)
                      ? p.filter((x) => x !== o.value)
                      : [...p, o.value]
                  )
                }
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
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeCanonical}
            onChange={(e) => setIncludeCanonical(e.target.checked)}
            className="h-4 w-4 accent-emerald-700"
          />
          Include the canonical lexicon (19,270 entries) alongside crowdsourced
          VALIDATED entries
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={lkcSource}
            onChange={(e) => setLkcSource(e.target.checked)}
            className="h-4 w-4 accent-emerald-700"
          />
          Add a <code className="font-mono text-xs">dc:source</code> entry
          documenting the LKC Framework as a contributing source
        </label>
      </div>

      {dryRun ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-bold">Dry-run projection</p>
          <ul className="mt-1 grid gap-1 sm:grid-cols-3">
            <li>
              <strong>{dryRun.projected.entries.toLocaleString()}</strong>{" "}
              LexicalEntries
            </li>
            <li>
              <strong>{dryRun.projected.synsets.toLocaleString()}</strong>{" "}
              Synsets
            </li>
            <li>
              <strong>{dryRun.projected.crowdsourced.toLocaleString()}</strong>{" "}
              crowdsourced (new)
            </li>
          </ul>
          <p className="mt-1 text-xs">
            No file was generated and nothing was logged. Run the real export
            to download.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        <button
          onClick={runDry}
          disabled={busy}
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? "Validating…" : "🧪 Dry Run"}
        </button>
        <a
          href={`/api/export?${qs()}`}
          className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
        >
          ⇩ Generate & Download XML
        </a>
        <p className="self-center text-[11px] text-slate-400">
          The download is SHA-256 hashed and permanently logged (SRS §10.4).
        </p>
      </div>
    </div>
  );
}
