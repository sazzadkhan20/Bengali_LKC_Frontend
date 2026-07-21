"use client";

import { useEffect, useState } from "react";

export interface IliHit {
  ili: string;
  pos: string;
  words: string[];
  gloss: string;
  alreadyInBengali: boolean;
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
 * Princeton WordNet 2.1 ILI Finder — search by English word + POS and
 * pick a registry code. Used inline in Quick Input and as a standalone page.
 */
export function IliFinder({
  initialPos = "any",
  onSelect,
  compact = false,
}: {
  /** Pre-select a POS filter (e.g. the lemma POS from Quick Input). */
  initialPos?: string;
  /** When provided, each result shows a “Use this code” button. */
  onSelect?: (hit: IliHit) => void;
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
  const [fetchedKey, setFetchedKey] = useState("");
  const [registry, setRegistry] = useState<{
    version: string;
    synsetCount: number;
    lemmaCount: number;
  } | null>(null);
  const debounced = useDebounced(word, 280);
  const queryReady = debounced.trim().length >= 2;
  const searchKey = queryReady ? `${debounced.trim()}|${pos}` : "";
  const busy = searchKey !== "" && searchKey !== fetchedKey;
  const visibleHits = queryReady ? hits : [];

  useEffect(() => {
    if (!searchKey) return;
    let cancelled = false;
    const params = new URLSearchParams({
      word: debounced.trim(),
      pos,
    });
    fetch(`/api/lookup/ili?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setHits(d.results ?? []);
        if (d.registry) setRegistry(d.registry);
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      })
      .finally(() => {
        if (!cancelled) setFetchedKey(searchKey);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, pos, searchKey]);

  const field =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-teal-200 bg-teal-50/40 p-4"
          : "space-y-4"
      }
    >
      <div className={compact ? "mb-3" : ""}>
        <h3
          className={`font-bold text-slate-800 ${compact ? "text-sm" : "text-base"}`}
        >
          ILI Finder — Princeton WordNet 2.1
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Type an English word, pick a part of speech, then choose the meaning
          that matches your concept. The ILI code is filled in for you — no
          Python script required.
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
            className={field}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Part of speech
          </label>
          <select
            value={pos}
            onChange={(e) => setPos(e.target.value)}
            className={field}
          >
            {POS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {registry ? (
        <p className="mt-2 text-[11px] text-slate-400">
          Registry: WordNet {registry.version} ·{" "}
          {registry.synsetCount.toLocaleString()} synsets ·{" "}
          {registry.lemmaCount.toLocaleString()} lemmas
          {busy ? " · searching…" : null}
        </p>
      ) : null}

      <div className={compact ? "mt-3" : "mt-4"}>
        {queryReady && !busy && visibleHits.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            No WordNet 2.1 senses found for “{debounced.trim()}”
            {pos !== "any" ? ` (${pos})` : ""}. Try another spelling or a
            different POS.
          </p>
        ) : null}

        {visibleHits.length > 0 ? (
          <ul className={`space-y-2 ${compact ? "max-h-72 overflow-y-auto thin-scroll" : ""}`}>
            {visibleHits.map((h) => (
              <li
                key={h.ili}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <code className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                    {h.ili}
                  </code>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200">
                    {h.pos}
                  </span>
                  {h.alreadyInBengali ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
                      already in Bengali LKC — link instead
                    </span>
                  ) : null}
                  {onSelect && !h.alreadyInBengali ? (
                    <button
                      type="button"
                      onClick={() => onSelect(h)}
                      className="ml-auto rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800"
                    >
                      Use this code
                    </button>
                  ) : null}
                  {onSelect && h.alreadyInBengali ? (
                    <span className="ml-auto text-[11px] font-medium text-amber-700">
                      Use “Link to existing synset”
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-slate-800">
                  {h.words.join(", ")}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
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
