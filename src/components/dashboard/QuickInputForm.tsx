"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ILI_NOT_AVAILABLE, isIliNotAvailable } from "@/lib/ili";
import type { Role } from "@/lib/types";
import { IliFinder } from "@/components/dashboard/IliFinder";

/* ------------------------------------------------------------------ */
/* Generic autocomplete                                                */
/* ------------------------------------------------------------------ */

interface SynsetHit {
  id: string;
  ili: string;
  pos: string;
  definition?: string;
  words: string[];
}
interface WordHit {
  senseId: string;
  synsetId: string;
  lemma: string;
  pos: string;
  definition?: string;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Autocomplete<T>({
  placeholder,
  endpoint,
  render,
  keyOf,
  onSelect,
  selectedLabel,
  onClear,
}: {
  placeholder: string;
  endpoint: string;
  render: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
  onSelect: (item: T) => void;
  selectedLabel?: string;
  onClear?: () => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<T[]>([]);
  const debounced = useDebounced(q, 250);
  const boxRef = useRef<HTMLDivElement>(null);
  const queryReady = debounced.trim().length >= 2;
  const visibleHits = queryReady ? hits : [];

  useEffect(() => {
    if (!queryReady) return;
    let cancelled = false;
    fetch(`${endpoint}?q=${encodeURIComponent(debounced.trim())}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setHits(d.results ?? []);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [debounced, endpoint, queryReady]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (selectedLabel) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5">
        <span className="font-bengali min-w-0 flex-1 truncate text-sm font-semibold text-emerald-900">
          {selectedLabel}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-bold text-emerald-700 hover:text-rose-600"
        >
          ✕ change
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => visibleHits.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="font-bengali w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
      {open && visibleHits.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {visibleHits.map((h) => (
            <li key={keyOf(h)}>
              <button
                type="button"
                onClick={() => {
                  onSelect(h);
                  setOpen(false);
                  setQ("");
                }}
                className="block w-full px-3 py-2.5 text-left text-sm transition hover:bg-emerald-50"
              >
                {render(h)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick Input form (SRS §6.2)                                         */
/* ------------------------------------------------------------------ */

const SENSE_REL_TYPES = ["derivation", "antonym", "metonym"] as const;
const SYNSET_REL_TYPES = [
  "hypernym",
  "mero_part",
  "mero_substance",
  "mero_member",
  "attribute",
] as const;

interface RelRow {
  relType: string;
  target: string;
  label: string;
}

export function QuickInputForm({ role }: { role: Role }) {
  const router = useRouter();
  const [mountedAt] = useState(() => Date.now());
  const mountedAtRef = useRef(mountedAt);

  const [word, setWord] = useState("");
  const [pos, setPos] = useState("n");
  const [synsetAction, setSynsetAction] = useState<"link" | "create">("link");
  const [selectedSynset, setSelectedSynset] = useState<SynsetHit | null>(null);
  const [ili, setIli] = useState("");
  /** After “Use this code”, the finder is hidden until Discard. */
  const [iliPicked, setIliPicked] = useState(false);
  const [defLang, setDefLang] = useState<"ben" | "eng">("ben");
  const [defText, setDefText] = useState("");
  const [senseRels, setSenseRels] = useState<RelRow[]>([]);
  const [synsetRels, setSynsetRels] = useState<RelRow[]>([]);
  const [note, setNote] = useState("");
  const [captcha, setCaptcha] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [directApprove, setDirectApprove] = useState(false);
  const [justification, setJustification] = useState("");
  const [confirmNearDup, setConfirmNearDup] = useState(false);
  const [nearDupMessage, setNearDupMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const isModerator = role === "SYSTEM_MODERATOR";
  const lockedDefinition =
    synsetAction === "link" && selectedSynset?.definition ? true : false;

  const wordValid =
    word.trim().length > 0 &&
    word.trim().length <= 25 &&
    /[\u0980-\u09ff]/.test(word);

  async function submit(saveAsDraft: boolean) {
    setBusy(true);
    setErrors({});
    setSuccess(null);
    setNearDupMessage(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writtenForm: word.trim(),
          pos,
          synsetAction,
          synsetId: synsetAction === "link" ? selectedSynset?.id : undefined,
          iliCode:
            synsetAction === "create"
              ? isIliNotAvailable(ili)
                ? ILI_NOT_AVAILABLE
                : ili.trim()
              : undefined,
          definitionLanguage: defLang,
          definitionText: lockedDefinition ? undefined : defText.trim() || undefined,
          senseRelations: senseRels
            .filter((r) => r.target)
            .map((r) => ({ relType: r.relType, target: r.target })),
          synsetRelations: synsetRels
            .filter((r) => r.target)
            .map((r) => ({ relType: r.relType, target: r.target })),
          reviewerNote: note.trim() || undefined,
          honeypot,
          elapsedSeconds: (Date.now() - mountedAtRef.current) / 1000,
          captchaPassed: captcha,
          confirmNearDuplicate: confirmNearDup,
          directApprove: isModerator ? directApprove : undefined,
          directApproveJustification: isModerator ? justification : undefined,
          saveAsDraft,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.nearDuplicate) {
        setNearDupMessage(data.nearDuplicate);
        return;
      }
      if (!res.ok) {
        setErrors(data.errors ?? { form: data.error ?? "Submission failed." });
        return;
      }
      setSuccess(
        saveAsDraft
          ? `Saved as draft (${data.id}). You can edit it from My Submissions.`
          : data.state === "VALIDATED"
            ? `Entry ${data.id} submitted and directly VALIDATED.`
            : `Entry ${data.id} submitted — now in PENDING_REVIEW.`
      );
      // reset
      setWord("");
      setSelectedSynset(null);
      setIli("");
      setIliPicked(false);
      setDefText("");
      setSenseRels([]);
      setSynsetRels([]);
      setNote("");
      setCaptcha(false);
      setConfirmNearDup(false);
      setDirectApprove(false);
      setJustification("");
      mountedAtRef.current = Date.now();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-xs font-medium text-rose-600">{errors[key]}</p>
    ) : null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ {success}
        </div>
      ) : null}
      {errors.form || errors.timing || errors.captcha || errors.duplicate ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {errors.form ?? errors.timing ?? errors.captcha ?? errors.duplicate}
        </div>
      ) : null}
      {nearDupMessage ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">⚠ Possible duplicate</p>
          <p className="mt-1">{nearDupMessage}</p>
          <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={confirmNearDup}
              onChange={(e) => setConfirmNearDup(e.target.checked)}
              className="h-4 w-4 accent-amber-600"
            />
            I confirm this is a distinct meaning (legitimate polysemy)
          </label>
        </div>
      ) : null}

      {/* honeypot — invisible to humans (SRS §4.3) */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Bengali word */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Bengali word (writtenForm) <span className="text-rose-500">*</span>
          </label>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onBlur={() => setWord((w) => w.trim())}
            placeholder="যেমন: মুঠোফোন"
            lang="bn"
            maxLength={25}
            className={`font-bengali w-full rounded-xl border px-3 py-2.5 text-lg outline-none transition focus:ring-2 ${
              word && !wordValid
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
            }`}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Bengali Unicode (U+0980–U+09FF) · max 25 characters ·{" "}
            {25 - word.length} left
          </p>
          {fieldError("writtenForm")}
        </div>

        {/* POS */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Part of speech <span className="text-rose-500">*</span>
          </label>
          <select
            value={pos}
            onChange={(e) => {
              setPos(e.target.value);
              setSelectedSynset(null);
            }}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="n">Noun (n) — বিশেষ্য</option>
            <option value="v">Verb (v) — ক্রিয়া</option>
            <option value="a">Adjective (a) — বিশেষণ</option>
            <option value="r">Adverb (r) — ক্রিয়া বিশেষণ</option>
          </select>
          {fieldError("pos")}
        </div>
      </div>

      {/* Synset action */}
      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
        <legend className="px-2 text-sm font-bold text-slate-700">
          Concept (Synset) linkage <span className="text-rose-500">*</span>
        </legend>
        <div className="flex flex-wrap gap-5">
          {(
            [
              ["link", "Link to existing synset"],
              ["create", "Create new synset (ILI code or N/A)"],
            ] as const
          ).map(([val, label]) => (
            <label key={val} className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="radio"
                name="synsetAction"
                checked={synsetAction === val}
                onChange={() => {
                  setSynsetAction(val);
                  if (val === "link") {
                    setIli("");
                    setIliPicked(false);
                  }
                }}
                className="h-4 w-4 accent-emerald-700"
              />
              {label}
            </label>
          ))}
        </div>

        {synsetAction === "link" ? (
          <div className="mt-4">
            <Autocomplete<SynsetHit>
              placeholder="Search by synset ID, member word or definition…"
              endpoint="/api/lookup/synsets"
              keyOf={(h) => h.id}
              onSelect={(h) => setSelectedSynset(h)}
              selectedLabel={
                selectedSynset
                  ? `${selectedSynset.id} (${selectedSynset.pos}) — ${selectedSynset.words.join(", ") || "no words"} ${selectedSynset.definition ? `· ${selectedSynset.definition}` : ""}`
                  : undefined
              }
              onClear={() => setSelectedSynset(null)}
              render={(h) => (
                <span>
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {h.id}
                  </span>{" "}
                  <span className="rounded bg-slate-100 px-1 text-[10px] font-bold uppercase">
                    {h.pos}
                  </span>{" "}
                  <span className="font-bengali">{h.words.join(", ")}</span>
                  {h.definition ? (
                    <span className="font-bengali block text-xs text-slate-400">
                      {h.definition}
                    </span>
                  ) : null}
                </span>
              )}
            />
            {selectedSynset && selectedSynset.pos !== pos ? (
              <p className="mt-1 text-xs font-medium text-rose-600">
                POS mismatch: this synset is “{selectedSynset.pos}” but your
                lemma is “{pos}”.
              </p>
            ) : null}
            {fieldError("synsetId")}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                ILI code <span className="text-rose-500">*</span>
              </label>

              <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 transition hover:border-emerald-300">
                <input
                  type="checkbox"
                  checked={isIliNotAvailable(ili)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setIli(ILI_NOT_AVAILABLE);
                      setIliPicked(true);
                    } else {
                      setIli("");
                      setIliPicked(false);
                    }
                  }}
                  className="mt-0.5 h-4 w-4 accent-emerald-700"
                />
                <span>
                  <span className="font-semibold text-slate-800">
                    N/A — ILI not available
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Select when no Princeton WordNet 2.1 concept applies yet.
                    Editors can attach an ILI later if one is found.
                  </span>
                </span>
              </label>

              {isIliNotAvailable(ili) ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5">
                  <code className="min-w-0 flex-1 font-mono text-sm font-bold text-amber-900">
                    {ILI_NOT_AVAILABLE}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      setIli("");
                      setIliPicked(false);
                    }}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                  >
                    Clear N/A
                  </button>
                </div>
              ) : iliPicked && ili ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5">
                  <code className="min-w-0 flex-1 font-mono text-sm font-bold text-emerald-900">
                    {ili}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      setIli("");
                      setIliPicked(false);
                    }}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                  >
                    Discard
                  </button>
                </div>
              ) : (
                <input
                  value={ili}
                  onChange={(e) => {
                    setIli(e.target.value);
                    setIliPicked(false);
                  }}
                  placeholder="ILI code, e.g. 04192858-n — or pick one below / select N/A"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              )}
              <p className="mt-1 text-[11px] text-slate-400">
                {isIliNotAvailable(ili)
                  ? "This entry will be created without a WordNet ILI link."
                  : `Format: {8-digit-zero-padded-offset}-{n|v|a|r} — must exist in the Princeton WordNet 2.1 registry${
                      iliPicked
                        ? ". Discard to choose a different code."
                        : ". Use the finder below if you do not know the code, or select N/A above."
                    }`}
              </p>
              {fieldError("iliCode")}
            </div>
            {!iliPicked && !isIliNotAvailable(ili) ? (
              <IliFinder
                compact
                initialPos={pos}
                onSelect={(hit) => {
                  setIli(hit.ili);
                  setIliPicked(true);
                }}
              />
            ) : null}
          </div>
        )}
        {fieldError("synsetAction")}
      </fieldset>

      {/* Definition */}
      <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Definition language
          </label>
          <select
            value={defLang}
            onChange={(e) => setDefLang(e.target.value as "ben" | "eng")}
            disabled={lockedDefinition}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100"
          >
            <option value="ben">Bengali (ben)</option>
            <option value="eng">English (eng)</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Definition text{" "}
            <span className="font-normal text-slate-400">(optional, max 500)</span>
          </label>
          {lockedDefinition ? (
            <div className="font-bengali rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600">
              🔒 {selectedSynset?.definition}
              <span className="mt-1 block text-[11px] text-slate-400">
                The selected synset already has a definition — field locked
                (SRS §6.2).
              </span>
            </div>
          ) : (
            <textarea
              value={defText}
              onChange={(e) => setDefText(e.target.value)}
              maxLength={500}
              rows={3}
              lang="bn"
              placeholder="ধারণাটির সংজ্ঞা লিখুন…"
              className="font-bengali w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          )}
          {fieldError("definitionText")}
        </div>
      </div>

      {/* Relations */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Sense relations */}
        <fieldset className="rounded-2xl border border-slate-200 p-5">
          <legend className="px-2 text-sm font-bold text-slate-700">
            Sense relations <span className="font-normal text-slate-400">(optional)</span>
          </legend>
          <div className="space-y-3">
            {senseRels.map((rel, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={rel.relType}
                  onChange={(e) =>
                    setSenseRels((rs) =>
                      rs.map((r, j) => (j === i ? { ...r, relType: e.target.value } : r))
                    )
                  }
                  className="w-32 shrink-0 rounded-lg border border-slate-300 px-2 py-2 text-xs"
                >
                  {SENSE_REL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="min-w-0 flex-1">
                  {rel.target ? (
                    <span className="font-bengali block truncate rounded-lg bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200">
                      {rel.label}
                    </span>
                  ) : (
                    <Autocomplete<WordHit>
                      placeholder="Target word…"
                      endpoint="/api/lookup/words"
                      keyOf={(h) => h.senseId}
                      onSelect={(h) =>
                        setSenseRels((rs) =>
                          rs.map((r, j) =>
                            j === i
                              ? { ...r, target: h.senseId, label: `${h.lemma} (${h.senseId})` }
                              : r
                          )
                        )
                      }
                      render={(h) => (
                        <span>
                          <span className="font-bengali font-semibold">{h.lemma}</span>{" "}
                          <span className="font-mono text-[10px] text-slate-400">{h.senseId}</span>
                          {h.definition ? (
                            <span className="font-bengali block text-xs text-slate-400">{h.definition}</span>
                          ) : null}
                        </span>
                      )}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSenseRels((rs) => rs.filter((_, j) => j !== i))}
                  className="shrink-0 text-slate-400 hover:text-rose-600"
                  aria-label="Remove relation"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setSenseRels((rs) => [...rs, { relType: "derivation", target: "", label: "" }])
              }
              className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700"
            >
              + Add sense relation
            </button>
          </div>
        </fieldset>

        {/* Synset relations */}
        <fieldset className="rounded-2xl border border-slate-200 p-5">
          <legend className="px-2 text-sm font-bold text-slate-700">
            Synset relations <span className="font-normal text-slate-400">(optional)</span>
          </legend>
          <div className="space-y-3">
            {synsetRels.map((rel, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={rel.relType}
                  onChange={(e) =>
                    setSynsetRels((rs) =>
                      rs.map((r, j) => (j === i ? { ...r, relType: e.target.value } : r))
                    )
                  }
                  className="w-32 shrink-0 rounded-lg border border-slate-300 px-2 py-2 text-xs"
                >
                  {SYNSET_REL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="min-w-0 flex-1">
                  {rel.target ? (
                    <span className="font-bengali block truncate rounded-lg bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200">
                      {rel.label}
                    </span>
                  ) : (
                    <Autocomplete<SynsetHit>
                      placeholder="Target synset…"
                      endpoint="/api/lookup/synsets"
                      keyOf={(h) => h.id}
                      onSelect={(h) =>
                        setSynsetRels((rs) =>
                          rs.map((r, j) =>
                            j === i
                              ? { ...r, target: h.id, label: `${h.words.join(", ") || h.id} (${h.id})` }
                              : r
                          )
                        )
                      }
                      render={(h) => (
                        <span>
                          <span className="font-mono text-xs font-bold text-emerald-700">{h.id}</span>{" "}
                          <span className="font-bengali">{h.words.join(", ")}</span>
                        </span>
                      )}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSynsetRels((rs) => rs.filter((_, j) => j !== i))}
                  className="shrink-0 text-slate-400 hover:text-rose-600"
                  aria-label="Remove relation"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setSynsetRels((rs) => [...rs, { relType: "hypernym", target: "", label: "" }])
              }
              className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700"
            >
              + Add synset relation
            </button>
          </div>
        </fieldset>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Notes for reviewers{" "}
          <span className="font-normal text-slate-400">
            (optional — internal, never exported to XML)
          </span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {/* SM direct approval */}
      {isModerator ? (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-5">
          <label className="flex items-center gap-2 text-sm font-bold text-purple-900">
            <input
              type="checkbox"
              checked={directApprove}
              onChange={(e) => setDirectApprove(e.target.checked)}
              className="h-4 w-4 accent-purple-700"
            />
            ⚡ Direct Approval — promote immediately to VALIDATED, bypassing LE
            and CLE review
          </label>
          {directApprove ? (
            <div className="mt-3">
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={2}
                placeholder="Mandatory written justification (minimum 20 characters)…"
                className="w-full rounded-xl border border-purple-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
              />
              {fieldError("directApproveJustification")}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* CAPTCHA simulation */}
      {!isModerator ? (
        <label className="flex w-fit cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm">
          <input
            type="checkbox"
            checked={captcha}
            onChange={(e) => setCaptcha(e.target.checked)}
            className="h-5 w-5 accent-emerald-700"
          />
          <span className="text-sm font-medium text-slate-700">
            I&apos;m not a robot
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-300">
            hCaptcha simulation
          </span>
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-emerald-700 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit for Review"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(true)}
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Save as Draft
        </button>
        <p className="text-[11px] text-slate-400">
          Server checks: honeypot → timing (≥10s) → CAPTCHA → duplicate
          detection (SRS §6.2).
        </p>
      </div>
    </form>
  );
}
