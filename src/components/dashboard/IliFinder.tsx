"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface IliHit {
  ili: string;
  pos: string;
  words: string[];
  gloss: string;
  /** True when a Bengali synset already exists for this concept. */
  alreadyInBengali: boolean;
  /** The Bengali synset that already uses this ILI, if any. */
  synsetId?: string | null;
  /** Submission that already proposes this ILI as a new synset, if any. */
  proposedIn?: string | null;
}

interface RegistryInfo {
  version: string;
  loaded: boolean;
  synsetCount: number;
  lemmaCount: number;
}

const POS_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "Any POS" },
  { value: "n", label: "Noun (n)" },
  { value: "v", label: "Verb (v)" },
  { value: "a", label: "Adjective (a)" },
  { value: "r", label: "Adverb (r)" },
];

function useDebounced(value: string, ms: number): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Princeton WordNet 3.0 ILI Finder — search by English word + POS and pick a registry code.
 * Used inline in Quick Input (`onSelect`) and as a standalone page (`hrefFor` / copy).
 */
export function IliFinder({
  initialPos = "any",
  onSelect,
  hrefFor,
  compact = false,
}: {
  /** Pre-select a POS filter (e.g. the lemma POS from Quick Input). */
  initialPos?: string;
  /** Quick Input: “Use this code” fills the ILI field. */
  onSelect?: (hit: IliHit) => void;
  /** Standalone page: “Use this code” opens this link (e.g. Quick Input prefilled). Without it the code is copied. */
  hrefFor?: (hit: IliHit) => string;
  /** Tighter layout for embedding inside Quick Input. */
  compact?: boolean;
}) {
  const [word, setWord] = useState("");
  const [pos, setPos] = useState(initialPos);
  const [prevInitialPos, setPrevInitialPos] = useState(initialPos);
  if (initialPos !== prevInitialPos) {
    setPrevInitialPos(initialPos);
    setPos(initialPos);
  }
  const [hits, setHits] = useState<IliHit[]>([]);
  const [failed, setFailed] = useState(false);
  const [fetchedKey, setFetchedKey] = useState("");
  const [registry, setRegistry] = useState<RegistryInfo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const debounced = useDebounced(word, 280);
  const queryReady = debounced.trim().length >= 2;
  const searchKey = queryReady ? `${debounced.trim()}|${pos}` : "";
  const busy = searchKey !== "" && searchKey !== fetchedKey;
  const visibleHits = queryReady ? hits : [];

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ word: searchKey ? debounced.trim() : "", pos });
    fetch(`/api/lookup/ili?${params}`, { credentials: "include" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "unavailable");
        return d;
      })
      .then((d) => {
        if (cancelled) return;
        setFailed(false);
        setHits(Array.isArray(d.results) ? d.results : []);
        if (d.registry) setRegistry(d.registry);
      })
      .catch(() => {
        if (cancelled) return;
        setHits([]);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setFetchedKey(searchKey);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, pos, searchKey]);

  async function copyCode(ili: string) {
    try {
      await navigator.clipboard.writeText(ili);
      setCopied(ili);
      setTimeout(() => setCopied((c) => (c === ili ? null : c)), 2000);
    } catch {
      setCopied(null);
    }
  }

  const field =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";
  const useButton =
    "ml-auto rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800";
  const registryDown = registry !== null && !registry.loaded;

  return (
    <div className={compact ? "rounded-xl border border-teal-200 bg-teal-50/40 p-4" : "space-y-4"}>
      <div className={compact ? "mb-3" : ""}>
        <h3 className={`font-bold text-slate-800 ${compact ? "text-sm" : "text-base"}`}>
          ILI Finder — Princeton WordNet 3.0
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Type an English word, pick a part of speech, then choose the meaning that matches your
          concept. Concepts that already have a Bengali synset are marked “already present” — link
          to that synset instead of creating a new one.
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? "sm:grid-cols-[1fr_10rem]" : "sm:grid-cols-[1fr_12rem]"}`}>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
            English word
          </label>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. galaxy, telephone, renewable…"
            lang="en"
            className={field}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Part of speech
          </label>
          <select value={pos} onChange={(e) => setPos(e.target.value)} className={field}>
            {POS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {registry && registry.loaded ? (
        <p className="mt-2 text-[11px] text-slate-400">
          Registry: Princeton WordNet {registry.version} · {registry.synsetCount.toLocaleString()} synsets ·{" "}
          {registry.lemmaCount.toLocaleString()} lemmas
          {busy ? " · searching…" : null}
        </p>
      ) : busy ? (
        <p className="mt-2 text-[11px] text-slate-400">Searching…</p>
      ) : null}

      <div className={compact ? "mt-3" : "mt-4"}>
        {failed || registryDown ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
            {registryDown
              ? "The WordNet 3.0 registry is not available right now. Try again in a minute."
              : "The ILI Finder is unavailable right now. Check your connection and try again."}
          </p>
        ) : queryReady && !busy && visibleHits.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            No WordNet 3.0 senses found for “{debounced.trim()}”
            {pos !== "any" ? ` (${pos})` : ""}. Try another spelling or a different POS.
          </p>
        ) : null}

        {visibleHits.length > 0 && !failed ? (
          <ul className={`space-y-2 ${compact ? "max-h-72 overflow-y-auto thin-scroll" : ""}`}>
            {visibleHits.map((h) => (
              <li key={h.ili} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                    {h.ili}
                  </code>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200">
                    {h.pos}
                  </span>
                  {h.alreadyInBengali ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
                      already present
                    </span>
                  ) : h.proposedIn ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
                      already proposed in {h.proposedIn}
                    </span>
                  ) : null}

                  {h.alreadyInBengali ? (
                    <span className="ml-auto text-[11px] font-medium text-amber-700">
                      {h.synsetId ? (
                        <>
                          In synset{" "}
                          <Link href={`/synset/${encodeURIComponent(h.synsetId)}`} className="font-mono underline">
                            {h.synsetId}
                          </Link>
                          {onSelect ? " — use “Link to existing synset”" : ""}
                        </>
                      ) : (
                        "Use “Link to existing synset”"
                      )}
                    </span>
                  ) : h.proposedIn ? (
                    <span className="ml-auto text-[11px] font-medium text-amber-700">
                      Link to its synset once it is validated
                    </span>
                  ) : onSelect ? (
                    <button type="button" onClick={() => onSelect(h)} className={useButton}>
                      Use this code
                    </button>
                  ) : hrefFor ? (
                    <Link href={hrefFor(h)} className={useButton}>
                      Use this code
                    </Link>
                  ) : (
                    <button type="button" onClick={() => copyCode(h.ili)} className={useButton}>
                      {copied === h.ili ? "✓ Copied" : "Use this code"}
                    </button>
                  )}
                </div>
                <p lang="en" className="mt-1.5 text-sm font-semibold text-slate-800">
                  {h.words.join(", ")}
                </p>
                <p lang="en" className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {h.gloss}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
