"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ILI_NOT_AVAILABLE, isIliNotAvailable, normalizeIliCode } from "@/lib/ili";
import Link from "next/link";
import { POS_LABEL, STATE_LABEL } from "@/lib/format";
import type { EntryState, POS, Role } from "@/lib/types";
import { IliFinder } from "@/components/dashboard/IliFinder";
import { LangBadge, sortDefinitions, StateBadge, type DefinitionItem } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

/* ------------------------------------------------------------------ */
/* Generic autocomplete                                                */
/* ------------------------------------------------------------------ */

interface SynsetHit {
  id: string;
  ili: string;
  pos: string;
  /** Primary definition preview. */
  definition?: string;
  /** Every definition of the synset (at most one per language). */
  definitions?: DefinitionItem[];
  words: string[];
  origin?: string;
}
interface WordHit {
  senseId: string;
  synsetId: string;
  lemma: string;
  pos: string;
  definition?: string;
  origin?: string;
}

/** CAPTCHA settings from `GET /api/config/captcha`. */
export interface CaptchaClientConfig {
  enabled: boolean;
  provider: "RECAPTCHA_V3" | "CHECKBOX";
  siteKey: string | null;
  action: string;
}

const CHECKBOX_CAPTCHA: CaptchaClientConfig = { enabled: true, provider: "CHECKBOX", siteKey: null, action: "submit_entry" };

interface Grecaptcha {
  ready(cb: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
}

function loadRecaptcha(siteKey: string): Promise<Grecaptcha> {
  const w = window as unknown as { grecaptcha?: Grecaptcha };
  if (w.grecaptcha) return Promise.resolve(w.grecaptcha);
  return new Promise((resolve, reject) => {
    const id = "recaptcha-v3-script";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.async = true;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      document.head.appendChild(script);
    }
    const timer = window.setTimeout(() => reject(new Error("timeout")), 10_000);
    script.addEventListener("load", () => {
      window.clearTimeout(timer);
      if (w.grecaptcha) resolve(w.grecaptcha);
      else reject(new Error("unavailable"));
    });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      reject(new Error("blocked"));
    });
  });
}

async function recaptchaToken(siteKey: string, action: string): Promise<string> {
  const g = await loadRecaptcha(siteKey);
  await new Promise<void>((resolve) => g.ready(resolve));
  return g.execute(siteKey, { action });
}

/** randomUUID is only available on HTTPS / localhost; fall back to getRandomValues elsewhere. */
function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return "qi-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function NewBadge({ origin }: { origin?: string }) {
  return origin === "USER" ? (
    <span
      title="Added through the platform after validation"
      className="rounded bg-sky-50 px-1 text-[10px] font-bold uppercase text-sky-700 ring-1 ring-inset ring-sky-200"
    >
      New
    </span>
  ) : null;
}

function Autocomplete<T>({
  placeholder,
  endpoint,
  render,
  keyOf,
  onSelect,
  selectedLabel,
  onClear,
  posFilter,
  disabledReason,
  invalid = false,
}: {
  placeholder: string;
  endpoint: string;
  render: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
  onSelect: (item: T) => void;
  selectedLabel?: string;
  onClear?: () => void;
  /** Optional POS filter forwarded to the lookup API */
  posFilter?: string;
  /** Why a result cannot be picked (e.g. already used in another row), or null. */
  disabledReason?: (item: T) => string | null;
  invalid?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<T[]>([]);
  const [resolvedKey, setResolvedKey] = useState("");
  const debounced = useDebounced(q, 250);
  const boxRef = useRef<HTMLDivElement>(null);
  const queryReady = debounced.trim().length >= 2;
  const requestKey = `${endpoint}|${posFilter ?? ""}|${debounced.trim()}`;
  const loading = queryReady && resolvedKey !== requestKey;
  const visibleHits = queryReady && resolvedKey === requestKey ? hits : [];

  useEffect(() => {
    if (!queryReady) return;
    let cancelled = false;
    const qs = new URLSearchParams({ q: debounced.trim() });
    if (posFilter) qs.set("pos", posFilter);
    fetch(`${endpoint}?${qs.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setHits(d.results ?? []);
          setOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      })
      .finally(() => {
        if (!cancelled) setResolvedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, endpoint, queryReady, posFilter, requestKey]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (selectedLabel) {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
          invalid ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"
        }`}
      >
        <span
          className={`font-bengali min-w-0 flex-1 truncate text-sm font-semibold ${
            invalid ? "text-red-900" : "text-emerald-900"
          }`}
        >
          {selectedLabel}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-bold text-emerald-700 hover:text-red-600"
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
        aria-invalid={invalid || undefined}
        className={`font-bengali w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
          invalid
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
        }`}
      />
      {loading && queryReady ? (
        <p className="mt-1 text-[11px] text-slate-400">Searching lexicon…</p>
      ) : null}
      {open && visibleHits.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {visibleHits.map((h) => {
            const reason = disabledReason?.(h) ?? null;
            return (
              <li key={keyOf(h)}>
                <button
                  type="button"
                  disabled={reason !== null}
                  title={reason ?? undefined}
                  onClick={() => {
                    onSelect(h);
                    setOpen(false);
                    setQ("");
                  }}
                  className="block w-full px-3 py-2.5 text-left text-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 disabled:hover:bg-slate-50"
                >
                  {render(h)}
                  {reason ? (
                    <span className="mt-0.5 block text-[11px] font-semibold text-red-600">
                      {reason}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && queryReady && !loading && visibleHits.length === 0 ? (
        <p className="mt-1 text-[11px] text-slate-400">No matches in the lexicon.</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Validation — mirrors the backend EntryValidator rule for rule       */
/* ------------------------------------------------------------------ */

const SENSE_REL_TYPES = ["derivation", "antonym", "metonym"] as const;
const SYNSET_REL_TYPES = [
  "hypernym",
  "mero_part",
  "mero_substance",
  "mero_member",
  "attribute",
] as const;

const WORD_MAX = 25;
const DEFINITION_MIN = 5;
const DEFINITION_MAX = 500;
const NOTE_MAX = 500;

/** Supported definition languages, in display order; a synset has at most one definition per language. */
const DEF_LANGS = ["ben", "eng"] as const;
type DefLang = (typeof DEF_LANGS)[number];
const DEF_LANG_LABEL: Record<DefLang, string> = { ben: "Bengali (ben)", eng: "English (eng)" };
const DEF_LANG_NAME: Record<string, string> = { ben: "Bengali", eng: "English" };

/** One definition being written in the form; rows with empty text are not sent. */
interface DefRow {
  key: number;
  language: DefLang;
  text: string;
}

const isDefLang = (v: string): v is DefLang => (DEF_LANGS as readonly string[]).includes(v);
const RELATIONS_MAX = 20;

const BENGALI_RE = /[\u0980-\u09ff]/;
const LATIN_RE = /[A-Za-z]/;
const WORD_ALLOWED_RE = /^[\u0981-\u09E3\u09F0\u09F1\u09FC\u09FE\u200C\u200D \-]+$/;
const WORD_START_RE = /^[\u0985-\u09B9\u09CE\u09DC-\u09E1\u09F0\u09F1]/;
const ILI_RE = /^\d{8}-[nvar]$/;

const POS_NAME: Record<string, string> = { n: "noun", v: "verb", a: "adjective", r: "adverb" };

const codePoints = (s: string) => Array.from(s).length;
const cleanWord = (s: string) => s.trim().replace(/\s+/g, " ");

const relationRow = z.object({ relType: z.string(), target: z.string() });

const quickInputSchema = z
  .object({
    writtenForm: z.string(),
    pos: z.enum(["n", "v", "a", "r"], { message: "Select a part of speech." }),
    synsetAction: z.enum(["link", "create"], {
      message: "Choose to link an existing synset or create a new one.",
    }),
    synsetId: z.string().optional(),
    synsetPos: z.string().optional(),
    iliCode: z.string().optional(),
    /** Definitions to send (non-empty rows), in form order — keys line up with the server's "definitions.N". */
    definitions: z.array(z.object({ language: z.string(), text: z.string() })),
    /** Languages the linked synset already has a definition in. */
    existingLanguages: z.array(z.string()),
    reviewerNote: z
      .string()
      .refine((v) => codePoints(v.trim()) <= NOTE_MAX, `Note must be at most ${NOTE_MAX} characters.`),
    senseRelations: z
      .array(relationRow)
      .max(RELATIONS_MAX, `At most ${RELATIONS_MAX} sense relations are allowed per entry.`),
    synsetRelations: z
      .array(relationRow)
      .max(RELATIONS_MAX, `At most ${RELATIONS_MAX} synset relations are allowed per entry.`),
  })
  .superRefine((v, ctx) => {
    const add = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    const word = cleanWord(v.writtenForm);
    if (!word) add(["writtenForm"], "Bengali word is required.");
    else if (!WORD_ALLOWED_RE.test(word))
      add(["writtenForm"], "Use Bengali letters only — digits, English letters and symbols are not allowed.");
    else if (!WORD_START_RE.test(word))
      add(["writtenForm"], "The word must start with a Bengali letter, not a vowel sign or mark.");
    else if (/^-|-$|--| -|- /.test(word))
      add(["writtenForm"], "A hyphen may only join two parts of the word.");
    else if (codePoints(word) > WORD_MAX)
      add(["writtenForm"], `Maximum ${WORD_MAX} characters allowed.`);

    if (v.synsetAction === "link") {
      if (!v.synsetId) add(["synsetId"], "Search and select an existing synset.");
      else if (v.synsetPos && v.synsetPos !== v.pos)
        add(
          ["synsetId"],
          `POS mismatch: the selected synset is ${POS_NAME[v.synsetPos] ?? v.synsetPos} but the word is ${POS_NAME[v.pos]}.`
        );
    } else {
      const ili = (v.iliCode ?? "").trim().toLowerCase();
      if (!ili) add(["iliCode"], "Enter an ILI code or select N/A.");
      else if (!isIliNotAvailable(ili) && !ILI_RE.test(ili))
        add(
          ["iliCode"],
          "ILI code must follow the format {8-digit-offset}-{n|v|a|r}, e.g. 04192858-n — or select N/A."
        );
      else if (!isIliNotAvailable(ili) && !ili.endsWith(`-${v.pos}`))
        add(
          ["iliCode"],
          `The ILI code's POS suffix (-${ili.slice(-1)}) must match the selected part of speech (-${v.pos}).`
        );
    }

    const firstLang = new Map<string, number>();
    v.definitions.forEach((d, i) => {
      const def = d.text.trim();
      const name = DEF_LANG_NAME[d.language] ?? d.language;
      const len = codePoints(def);
      if (!isDefLang(d.language)) add(["definitions", i], "Select the definition language.");
      else if (v.synsetAction === "link" && v.existingLanguages.includes(d.language))
        add(
          ["definitions", i],
          `The selected synset already has a definition in ${name}. Add a definition in another language, or remove this one.`
        );
      else if (firstLang.has(d.language))
        add(
          ["definitions", i],
          `Only one definition per language: ${name} is already used in definition ${firstLang.get(d.language)! + 1}.`
        );
      else {
        firstLang.set(d.language, i);
        if (len < DEFINITION_MIN)
          add(["definitions", i], `Definition must be at least ${DEFINITION_MIN} characters.`);
        else if (len > DEFINITION_MAX)
          add(["definitions", i], `Definition must be at most ${DEFINITION_MAX} characters.`);
        else if (d.language === "ben" && (!BENGALI_RE.test(def) || LATIN_RE.test(def)))
          add(["definitions", i], "A Bengali definition must be written in Bengali script.");
        else if (d.language === "eng" && (!LATIN_RE.test(def) || BENGALI_RE.test(def)))
          add(["definitions", i], "An English definition must be written in English (Latin script).");
      }
    });

    const firstSense = new Map<string, number>();
    v.senseRelations.forEach((r, i) => {
      if (!(SENSE_REL_TYPES as readonly string[]).includes(r.relType))
        add(["senseRelations", i], "Choose a valid sense relation type.");
      else if (!r.target) add(["senseRelations", i], "Search and pick a target word, or remove this row.");
      else if (firstSense.has(r.target))
        add(
          ["senseRelations", i],
          `This word sense is already used in row ${firstSense.get(r.target)! + 1}. Each target can be related only once.`
        );
      else firstSense.set(r.target, i);
    });

    const firstSynset = new Map<string, number>();
    v.synsetRelations.forEach((r, i) => {
      if (!(SYNSET_REL_TYPES as readonly string[]).includes(r.relType))
        add(["synsetRelations", i], "Choose a valid synset relation type.");
      else if (!r.target) add(["synsetRelations", i], "Search and pick a target concept, or remove this row.");
      else if (v.synsetAction === "link" && r.target === v.synsetId)
        add(
          ["synsetRelations", i],
          "This is the synset your word is linked to — a synset cannot relate to itself."
        );
      else if (firstSynset.has(r.target))
        add(
          ["synsetRelations", i],
          `This concept is already used in row ${firstSynset.get(r.target)! + 1}. Each target can be related only once.`
        );
      else firstSynset.set(r.target, i);
    });
  });

const FIELD_LABEL: Record<string, string> = {
  writtenForm: "Bengali word",
  pos: "Part of speech",
  synsetAction: "Concept linkage",
  synsetId: "Synset",
  iliCode: "ILI code",
  definitions: "Definitions",
  reviewerNote: "Notes",
  senseRelations: "Sense relations",
  synsetRelations: "Synset relations",
  duplicate: "Duplicate",
};

function fieldLabel(key: string): string {
  const [root, row] = key.split(".");
  if (row !== undefined) {
    if (root === "definitions") return `Definition ${Number(row) + 1}`;
    return `${root === "senseRelations" ? "Sense relation" : "Synset relation"} row ${Number(row) + 1}`;
  }
  return FIELD_LABEL[root] ?? "Entry";
}

/** Keys whose "required" errors stay hidden until the user has worked on that field. */
const TOUCH_GATED = new Set([
  "writtenForm",
  "synsetId",
  "iliCode",
  "definitions",
  "reviewerNote",
]);

interface RelRow {
  relType: string;
  target: string;
  label: string;
}

/** The tied arbitration case a System Moderator is resolving by correcting and validating the entry. */
export interface TieContext {
  caseId: string;
  reviewerLabel: string;
  contributorName: string;
  reviewerName: string;
  contributorNote: string | null;
  reviewerNote: string | null;
  contributorVotes: number;
  reviewerVotes: number;
  votes: { curator: string; verdict: "CONTRIBUTOR" | "REVIEWER"; rationale: string }[];
}

/**
 * An existing entry loaded into the form: a FLAGGED / C_FLAGGED entry for correction and resubmission,
 * or (with {@link TieContext}) an entry in a tied arbitration case for the System Moderator to correct and validate.
 */
export interface ResubmissionSource {
  id: string;
  version: number | null;
  state: "FLAGGED" | "C_FLAGGED" | "ARBITRATION";
  tie?: TieContext;
  targetState: EntryState;
  feedback: string | null;
  writtenForm: string;
  pos: string;
  synsetAction: "link" | "create";
  synset: SynsetHit | null;
  iliCode: string | null;
  /** The entry's own definitions (for a linked synset: the ones it adds). */
  definitions: DefinitionItem[];
  reviewerNote: string;
  senseRelations: RelRow[];
  synsetRelations: RelRow[];
}

interface ServerCheck {
  key: string;
  errors: Record<string, string>;
  nearDuplicate: string | null;
  failed?: boolean;
}

export function QuickInputForm({
  role,
  resubmission,
  captchaConfig = CHECKBOX_CAPTCHA,
  prefill,
}: {
  role: Role;
  resubmission?: ResubmissionSource;
  captchaConfig?: CaptchaClientConfig;
  /** New entry started from the ILI Finder: “Create new synset” with this ILI code already picked. */
  prefill?: { ili: string; pos: string };
}) {
  const router = useRouter();
  const [mountedAt] = useState(() => Date.now());
  const mountedAtRef = useRef(mountedAt);
  /** Same key for retries / double-clicks of one entry; renewed only after a successful submit. */
  const idempotencyKeyRef = useRef<string | null>(null);
  const src = resubmission;
  const tie = src?.tie;

  const start = src ? null : prefill;
  const [word, setWord] = useState(src?.writtenForm ?? "");
  const [pos, setPos] = useState(src?.pos ?? start?.pos ?? "n");
  const [synsetAction, setSynsetAction] = useState<"link" | "create">(
    src?.synsetAction ?? (start ? "create" : "link")
  );
  const [selectedSynset, setSelectedSynset] = useState<SynsetHit | null>(src?.synset ?? null);
  const [ili, setIli] = useState(normalizeIliCode(src?.iliCode ?? start?.ili));
  /** After “Use this code”, the finder is hidden until Discard. */
  const [iliPicked, setIliPicked] = useState(Boolean(src?.iliCode ?? start?.ili));
  const defKeyRef = useRef(0);
  const newDefRow = useCallback((language: DefLang, text = ""): DefRow => {
    defKeyRef.current += 1;
    return { key: defKeyRef.current, language, text };
  }, []);
  /** Definitions written in the form. A new synset starts with one (optional) row. */
  const [defs, setDefs] = useState<DefRow[]>(() => {
    const own = sortDefinitions(src?.definitions ?? []).filter((d) => isDefLang(d.language));
    if (own.length > 0) {
      return own.map((d, i) => ({ key: -(i + 1), language: d.language as DefLang, text: d.text }));
    }
    return (src?.synsetAction ?? (start ? "create" : "link")) === "create"
      ? [{ key: -1, language: "ben", text: "" }]
      : [];
  });
  const [senseRels, setSenseRels] = useState<RelRow[]>(src?.senseRelations ?? []);
  const [synsetRels, setSynsetRels] = useState<RelRow[]>(src?.synsetRelations ?? []);
  const [note, setNote] = useState(src?.reviewerNote ?? "");
  const [resubmitted, setResubmitted] = useState<{ id: string; state: EntryState } | null>(null);
  const [tieResolved, setTieResolved] = useState<{ id: string; changed: string[] } | null>(null);
  const [captcha, setCaptcha] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  /** The near-duplicate warning text the user confirmed; a different warning needs a new confirmation. */
  const [confirmedNear, setConfirmedNear] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [server, setServer] = useState<ServerCheck | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  /** Form-level problems from the submit call (CAPTCHA, bot checks, network…). */
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    kind: "submit" | "draft" | "resubmit" | "tie";
    entry: Record<string, unknown>;
  } | null>(null);

  /** Platform Architect and System Moderator entries are validated directly (no review queues, no CAPTCHA). */
  const isModerator =
    role === "SYSTEM_MODERATOR" || role === "PLATFORM_ARCHITECT";
  const roleName = role === "PLATFORM_ARCHITECT" ? "Platform Architect" : "System Moderator";
  const needsCaptcha = !isModerator && captchaConfig.enabled;
  const recaptchaKey =
    needsCaptcha && captchaConfig.provider === "RECAPTCHA_V3" && captchaConfig.siteKey ? captchaConfig.siteKey : null;
  const checkboxRequired = needsCaptcha && !recaptchaKey;

  useEffect(() => {
    // Load early so the token is ready by the time the user submits.
    if (recaptchaKey) loadRecaptcha(recaptchaKey).catch(() => undefined);
  }, [recaptchaKey]);

  /** CAPTCHA proof for the request body; throws when reCAPTCHA cannot produce a token. */
  async function captchaProof(): Promise<Record<string, unknown>> {
    if (!needsCaptcha) return {};
    if (recaptchaKey) return { captchaToken: await recaptchaToken(recaptchaKey, captchaConfig.action) };
    return { captchaPassed: captcha };
  }
  const CAPTCHA_LOAD_ERROR =
    "Verification could not load. Check your connection or allow google.com/recaptcha in your content blocker, then try again.";
  /** Definitions the linked synset already has — shown locked, and their languages cannot be added again. */
  const existingDefs = useMemo(
    () => (synsetAction === "link" ? sortDefinitions(selectedSynset?.definitions ?? []) : []),
    [synsetAction, selectedSynset]
  );
  const existingLanguages = useMemo(() => existingDefs.map((d) => d.language), [existingDefs]);
  /** Rows actually sent (non-empty text), in form order. */
  const sentDefs = useMemo(
    () => defs.filter((d) => d.text.trim() !== "").map((d) => ({ language: d.language, text: d.text.trim() })),
    [defs]
  );
  /** Row key → index in the sent list (where its errors are keyed). */
  const sentIndexByKey = useMemo(() => {
    const m = new Map<number, number>();
    let i = 0;
    for (const d of defs) if (d.text.trim() !== "") m.set(d.key, i++);
    return m;
  }, [defs]);
  const freeLanguages = (exceptKey: number | null) =>
    DEF_LANGS.filter(
      (l) => !existingLanguages.includes(l) && !defs.some((d) => d.key !== exceptKey && d.language === l)
    );
  const canAddDefinition =
    (synsetAction === "create" || Boolean(selectedSynset)) && freeLanguages(null).length > 0;
  const iliNa = isIliNotAvailable(ili);

  const touch = useCallback((...keys: string[]) => {
    setTouched((prev) => {
      if (keys.every((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
  }, []);

  /** Resubmission only: whether any field differs from the loaded entry (mirrors the server's change check). */
  const hasChanges = useMemo(() => {
    if (!src) return true;
    const relKey = (rows: RelRow[]) =>
      rows
        .filter((r) => r.target)
        .map((r) => `${r.relType}|${r.target}`)
        .sort()
        .join(",");
    const defKey = (rows: { language: string; text: string }[]) =>
      rows
        .filter((d) => d.text.trim())
        .map((d) => `${d.language}|${d.text.trim()}`)
        .sort()
        .join("\n");
    return (
      cleanWord(word) !== cleanWord(src.writtenForm) ||
      pos !== src.pos ||
      synsetAction !== src.synsetAction ||
      (synsetAction === "link" && (selectedSynset?.id ?? "") !== (src.synset?.id ?? "")) ||
      (synsetAction === "create" &&
        normalizeIliCode(ili).toLowerCase() !== normalizeIliCode(src.iliCode).toLowerCase()) ||
      defKey(sentDefs) !== defKey(src.definitions) ||
      relKey(senseRels) !== relKey(src.senseRelations) ||
      relKey(synsetRels) !== relKey(src.synsetRelations) ||
      note.trim() !== src.reviewerNote.trim()
    );
  }, [src, word, pos, synsetAction, selectedSynset, ili, sentDefs, senseRels, synsetRels, note]);

  /** Exactly what is sent to the server — every relation row included, so row errors line up by index. */
  const entry = useMemo(
    () => ({
      writtenForm: cleanWord(word),
      pos,
      synsetAction,
      synsetId: synsetAction === "link" ? selectedSynset?.id : undefined,
      iliCode:
        synsetAction === "create"
          ? iliNa
            ? ILI_NOT_AVAILABLE
            : ili.trim().toLowerCase()
          : undefined,
      definitions: sentDefs,
      senseRelations: senseRels.map((r) => ({ relType: r.relType, target: r.target })),
      synsetRelations: synsetRels.map((r) => ({ relType: r.relType, target: r.target })),
      reviewerNote: isModerator ? undefined : note.trim() || undefined,
    }),
    [word, pos, synsetAction, selectedSynset, ili, iliNa, sentDefs, senseRels, synsetRels, note, isModerator]
  );
  const entryKey = useMemo(() => JSON.stringify(entry), [entry]);

  /** Client-side Zod errors, keyed like the server's ("senseRelations.0", …). */
  const clientErrors = useMemo(() => {
    const parsed = quickInputSchema.safeParse({
      writtenForm: word,
      pos,
      synsetAction,
      synsetId: selectedSynset?.id,
      synsetPos: selectedSynset?.pos,
      iliCode: ili,
      definitions: sentDefs,
      existingLanguages,
      reviewerNote: note,
      senseRelations: senseRels,
      synsetRelations: synsetRels,
    });
    const out: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join(".") || "form";
        if (!out[key]) out[key] = issue.message;
      }
    }
    return out;
  }, [word, pos, synsetAction, selectedSynset, ili, sentDefs, existingLanguages, note, senseRels, synsetRels]);

  const wordReady = !clientErrors.writtenForm;
  const debouncedKey = useDebounced(entryKey, 400);

  /** Live server check: duplicates across the whole database, ILI registry, lexicon targets. */
  useEffect(() => {
    if (!wordReady || debouncedKey !== entryKey) return;
    let cancelled = false;
    const key = debouncedKey;
    fetch("/api/lookup/validate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...JSON.parse(key), excludeSubmissionId: src?.id }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error ?? "unavailable");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setServer({
          key,
          errors: data.errors && typeof data.errors === "object" ? data.errors : {},
          nearDuplicate: data.nearDuplicate ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setServer({ key, errors: {}, nearDuplicate: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedKey, entryKey, wordReady, src?.id, retryTick]);

  const serverFresh = server !== null && server.key === entryKey;
  const validating = wordReady && !serverFresh;
  const serverFailed = serverFresh && server.failed === true;
  /** Last server answer stays visible while a newer check runs, so messages don't flicker. */
  const serverErrors = useMemo(
    () => (wordReady && server && !server.failed ? server.errors : {}),
    [wordReady, server]
  );
  const nearDuplicate =
    wordReady && server && !server.failed && !server.errors.duplicate ? server.nearDuplicate : null;
  const nearConfirmed = nearDuplicate !== null && confirmedNear === nearDuplicate;

  const allErrors = useMemo(
    () => ({ ...serverErrors, ...clientErrors }),
    [serverErrors, clientErrors]
  );

  const isVisible = useCallback(
    (key: string) => {
      const root = key.split(".")[0];
      return Boolean(src) || !TOUCH_GATED.has(root) || touched.has(root);
    },
    [src, touched]
  );

  /** Everything that still keeps Submit / Save as Draft / Resubmit disabled. */
  const blockers = useMemo(() => {
    const list: { key: string; text: string }[] = [];
    for (const [key, message] of Object.entries(allErrors)) {
      list.push({ key, text: `${fieldLabel(key)}: ${message}` });
    }
    if (serverFresh && !serverFailed && nearDuplicate && !nearConfirmed) {
      list.push({
        key: "near",
        text: "Possible duplicate: confirm it is a different meaning (polysemy), or change the entry.",
      });
    }
    if (serverFailed) {
      list.push({ key: "server", text: "Database check unavailable — retry in a moment." });
    }
    if (checkboxRequired && !captcha) {
      list.push({ key: "captcha", text: "Verification: tick “I'm not a robot”." });
    }
    if (src && !tie && !hasChanges) {
      list.push({ key: "changes", text: "Edit at least one field to resubmit." });
    }
    return list;
  }, [allErrors, serverFresh, serverFailed, nearDuplicate, nearConfirmed, checkboxRequired, captcha, src, tie, hasChanges]);

  const canSubmit = !busy && !validating && blockers.length === 0;

  /** Opens the confirmation popup; nothing is sent until the user confirms. */
  function requestSubmit(saveAsDraft: boolean) {
    setSuccess(null);
    setFormError(null);
    if (!canSubmit) {
      touch(...TOUCH_GATED);
      return;
    }
    setPending({ kind: tie ? "tie" : src ? "resubmit" : saveAsDraft ? "draft" : "submit", entry });
  }

  async function confirmPending() {
    if (!pending) return;
    const { kind, entry: payload } = pending;
    setBusy(true);
    try {
      if (kind === "tie") {
        await resolveTie(payload);
      } else if (kind === "resubmit") {
        await resubmit(payload);
      } else {
        await submit(payload, kind === "draft");
      }
    } finally {
      setPending(null);
    }
  }

  /** Shows a rejected submit response on the form: field errors inline, the rest in the banner. */
  function applyFailure(status: number, data: Record<string, unknown>, fallback: string, sentKey: string) {
    touch(...TOUCH_GATED);
    if (status === 409 && typeof data.nearDuplicate === "string") {
      setServer({ key: sentKey, errors: {}, nearDuplicate: data.nearDuplicate });
      setConfirmedNear(null);
      return;
    }
    const errs = (data.errors && typeof data.errors === "object" ? data.errors : {}) as Record<string, string>;
    const { form, captcha: captchaError, ...fieldErrors } = errs;
    if (Object.keys(fieldErrors).length > 0) {
      setServer((prev) => ({
        key: sentKey,
        errors: fieldErrors,
        nearDuplicate: prev?.key === sentKey ? prev.nearDuplicate : null,
      }));
    }
    if (captchaError) setCaptcha(false);
    setFormError(
      form ??
        captchaError ??
        (Object.keys(fieldErrors).length > 0
          ? "The entry was not saved. Fix the fields marked in red."
          : typeof data.error === "string"
            ? data.error
            : fallback)
    );
  }

  async function submit(payload: Record<string, unknown>, saveAsDraft: boolean) {
    idempotencyKeyRef.current ??= newIdempotencyKey();
    const sentKey = JSON.stringify(payload);
    let proof: Record<string, unknown>;
    try {
      proof = await captchaProof();
    } catch {
      setFormError(CAPTCHA_LOAD_ERROR);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          ...payload,
          honeypot,
          elapsedSeconds: (Date.now() - mountedAtRef.current) / 1000,
          ...proof,
          confirmNearDuplicate: nearConfirmed,
          saveAsDraft,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        applyFailure(res.status, data, "The entry could not be saved. Please try again.", sentKey);
        return;
      }
      idempotencyKeyRef.current = null;
      setSuccess(
        !data.id
          ? "Submission received."
          : saveAsDraft
          ? isModerator
            ? `Saved as draft (${data.id}). It will be validated directly when you submit it from My Submissions.`
            : `Saved as draft (${data.id}). You can edit it from My Submissions.`
          : data.state === "VALIDATED"
            ? `Entry ${data.id} validated directly — it is now part of the lexicon. Validation is final; its status cannot be changed.`
            : data.state === "UNDER_REVIEW"
              ? `Entry ${data.id} is held Under Review for a security check. A System Moderator will clear it shortly.`
              : `Entry ${data.id} submitted — it is now Pending Review in the Lexical Editor's queue.`
      );
      setWord("");
      setSelectedSynset(null);
      setIli("");
      setIliPicked(false);
      setDefs(synsetAction === "create" ? [newDefRow("ben")] : []);
      setSenseRels([]);
      setSynsetRels([]);
      setNote("");
      setCaptcha(false);
      setConfirmedNear(null);
      setTouched(new Set());
      setServer(null);
      mountedAtRef.current = Date.now();
      router.refresh();
    } catch {
      setFormError("Network error — the entry was not submitted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resubmit(payload: Record<string, unknown>) {
    if (!src) return;
    const sentKey = JSON.stringify(payload);
    let proof: Record<string, unknown>;
    try {
      proof = await captchaProof();
    } catch {
      setFormError(CAPTCHA_LOAD_ERROR);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(`/api/submissions/${encodeURIComponent(src.id)}/resubmit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...proof,
          confirmNearDuplicate: nearConfirmed,
          expectedVersion: src.version ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        applyFailure(res.status, data, "Resubmission failed. Please try again.", sentKey);
        return;
      }
      setResubmitted({ id: data.id ?? src.id, state: data.state ?? src.targetState });
    } catch {
      setFormError("Network error — the entry was not resubmitted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveTie(payload: Record<string, unknown>) {
    if (!src || !tie) return;
    const sentKey = JSON.stringify(payload);
    try {
      const res = await fetch(`/api/arbitration/${encodeURIComponent(tie.caseId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          action: "resolve_tie",
          confirmNearDuplicate: nearConfirmed,
          expectedVersion: src.version ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        applyFailure(res.status, data, "The tie could not be resolved. Please try again.", sentKey);
        return;
      }
      setTieResolved({
        id: data.submissionId ?? src.id,
        changed: Array.isArray(data.changed) ? data.changed : [],
      });
    } catch {
      setFormError("Network error — the tie was not resolved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const cancelPending = useCallback(() => setPending(null), []);

  const confirmCopy = ((): {
    title: string;
    description: string;
    confirmLabel: string;
    toState: EntryState;
  } => {
    const who = word.trim() ? `“${cleanWord(word)}”` : "This entry";
    if (tie) {
      return {
        title: "Resolve the tie and validate?",
        description: `${who} will be validated ${
          hasChanges ? "with your corrections" : "exactly as submitted — you have not changed any field"
        }. Case ${tie.caseId} is closed as resolved by the System Moderator, and the entry is added to the lexicon with permanent IDs.`,
        confirmLabel: "Yes, validate and resolve",
        toState: "VALIDATED",
      };
    }
    if (isModerator && pending?.kind !== "draft") {
      return {
        title: src ? "Resubmit and validate directly?" : "Submit and validate directly?",
        description: `As ${roleName}, your entry is not reviewed by a Lexical Editor or Chief Lexical Editor. ${who} will be marked Validated immediately and added to the lexicon with permanent IDs — it appears in search, can be linked and related, and is included in the XML export.`,
        confirmLabel: "Yes, validate now",
        toState: "VALIDATED",
      };
    }
    if (pending?.kind === "resubmit" && src) {
      const toChief = src.targetState === "EDITOR_APPROVED";
      return {
        title: "Resubmit this entry?",
        description: `${who} will be resubmitted with your corrections. Its status will change to ${STATE_LABEL[src.targetState]} and it goes back to ${
          toChief ? "the Chief Lexical Editor for final review" : "the Lexical Editor's review queue"
        }.`,
        confirmLabel: "Yes, resubmit",
        toState: src.targetState,
      };
    }
    if (pending?.kind === "draft") {
      return {
        title: "Save as draft?",
        description: isModerator
          ? `${who} will be saved as a Draft. Nothing is validated yet — when you submit it from My Submissions, it is marked Validated immediately and added to the lexicon, and from then on its status is final.`
          : `${who} will be saved as a Draft. It is not sent for review until you submit it from My Submissions.`,
        confirmLabel: "Save draft",
        toState: "DRAFT",
      };
    }
    return {
      title: "Submit for review?",
      description: `${who} will be submitted for review. Its status will be Pending Review and it will wait in the Lexical Editor's review queue. You can follow its progress in My Submissions.`,
      confirmLabel: "Yes, submit for review",
      toState: "PENDING_REVIEW",
    };
  })();

  const shownError = (key: string): string | null =>
    allErrors[key] && isVisible(key) ? allErrors[key] : null;

  const fieldError = (key: string) => {
    const message = shownError(key);
    return message ? (
      <p role="alert" className="mt-1 flex items-start gap-1 text-xs font-medium text-red-600">
        <span aria-hidden="true">⚠</span>
        <span>{message}</span>
      </p>
    ) : null;
  };

  const inputBorder = (key: string) =>
    shownError(key)
      ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-200"
      : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200";

  const usedSenseTargets = (exceptRow: number) =>
    new Map(senseRels.flatMap((r, j) => (r.target && j !== exceptRow ? [[r.target, j] as const] : [])));
  const usedSynsetTargets = (exceptRow: number) =>
    new Map(synsetRels.flatMap((r, j) => (r.target && j !== exceptRow ? [[r.target, j] as const] : [])));

  if (tieResolved && tie) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="font-bold">✓ Tie resolved — entry {tieResolved.id} is Validated.</p>
          <p className="mt-1">
            {tieResolved.changed.length > 0
              ? `Your corrections (${tieResolved.changed.join(", ")}) were applied.`
              : "The entry was validated without changes."}{" "}
            Arbitration case {tie.caseId} is closed and the entry is now part of the lexicon. Its status is final.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            href={`/dashboard/arbitration/${encodeURIComponent(tie.caseId)}`}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-white shadow-sm hover:bg-emerald-800"
          >
            View case
          </Link>
          <Link
            href={`/dashboard/submissions/${encodeURIComponent(tieResolved.id)}`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-slate-700 hover:bg-slate-50"
          >
            View entry
          </Link>
          <Link
            href="/dashboard/arbitration?phase=TIE_PENDING"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-slate-700 hover:bg-slate-50"
          >
            Other tied cases
          </Link>
        </div>
      </div>
    );
  }

  if (resubmitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="font-bold">✓ Entry {resubmitted.id} resubmitted.</p>
          <p className="mt-1">
            Status changed to {STATE_LABEL[resubmitted.state] ?? resubmitted.state}
            {resubmitted.state === "VALIDATED"
              ? " — it is now part of the lexicon and its status is final."
              : resubmitted.state === "EDITOR_APPROVED"
                ? " — it is back with the Chief Lexical Editor for final review."
                : " — it is back in the Lexical Editor review queue."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            href={`/dashboard/submissions/${encodeURIComponent(resubmitted.id)}`}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-white shadow-sm hover:bg-emerald-800"
          >
            View entry
          </Link>
          <Link
            href="/dashboard/submissions"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-slate-700 hover:bg-slate-50"
          >
            My submissions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        requestSubmit(false);
      }}
      noValidate
    >
      <ConfirmModal
        open={pending !== null}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        tone="primary"
        busy={busy}
        onConfirm={confirmPending}
        onCancel={cancelPending}
      >
        {confirmCopy.toState === "VALIDATED" ? (
          <div className="mb-3 space-y-2">
            <p className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-900">
              ⚡ Direct validation — no review step follows this confirmation.
            </p>
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              🔒 Validation is final. Once validated, the status cannot be changed or overridden, and the
              entry cannot be edited or withdrawn. Check every field before you confirm.
            </p>
          </div>
        ) : null}
        <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-inset ring-slate-200">
          <dt className="text-slate-400">Word</dt>
          <dd className="font-bengali col-span-2 font-bold text-slate-900">{cleanWord(word)}</dd>
          <dt className="text-slate-400">Part of speech</dt>
          <dd className="col-span-2 text-slate-700">{POS_LABEL[pos as POS] ?? pos}</dd>
          <dt className="text-slate-400">Concept</dt>
          <dd className="col-span-2 font-mono text-xs text-slate-700">
            {synsetAction === "link"
              ? `Link to ${selectedSynset?.id ?? "—"}`
              : iliNa
                ? "New synset · ILI N/A"
                : `New synset · ILI ${ili.trim().toLowerCase()}`}
          </dd>
          <dt className="text-slate-400">Definitions</dt>
          <dd className="col-span-2 space-y-1 text-xs text-slate-700">
            {sentDefs.length === 0 ? (
              <span className="italic text-slate-400">
                {existingDefs.length > 0 ? "No new definition (synset definitions kept)" : "No definition"}
              </span>
            ) : (
              sentDefs.map((d) => (
                <p key={d.language} className="flex items-start gap-1.5">
                  <LangBadge lang={d.language} />
                  <span className={`line-clamp-2 ${d.language === "eng" ? "" : "font-bengali"}`}>{d.text}</span>
                </p>
              ))
            )}
          </dd>
          {nearConfirmed ? (
            <>
              <dt className="text-slate-400">Polysemy</dt>
              <dd className="col-span-2 text-amber-700">Confirmed as a different meaning</dd>
            </>
          ) : null}
          <dt className="text-slate-400">New status</dt>
          <dd className="col-span-2">
            <StateBadge state={confirmCopy.toState} />
          </dd>
        </dl>
      </ConfirmModal>
      {tie && src ? (
        <div className="overflow-hidden rounded-xl border border-amber-300 bg-amber-50 text-sm text-amber-950">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="font-semibold">
              ⚖ Resolving tied case{" "}
              <Link href={`/dashboard/arbitration/${encodeURIComponent(tie.caseId)}`} className="font-mono underline">
                {tie.caseId}
              </Link>{" "}
              · entry <code className="font-mono">{src.id}</code>
            </p>
            <p className="flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-800 ring-1 ring-inset ring-emerald-200">
                Contributor {tie.contributorVotes}
              </span>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-rose-800 ring-1 ring-inset ring-rose-200">
                {tie.reviewerLabel} {tie.reviewerVotes}
              </span>
            </p>
          </div>
          <div className="grid gap-px border-t border-amber-200 bg-amber-200 sm:grid-cols-2">
            <div className="bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                Contributor — {tie.contributorName}
              </p>
              <p className="font-bengali mt-1 whitespace-pre-wrap text-xs text-slate-700">
                {tie.contributorNote ?? "No note submitted."}
              </p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700">
                {tie.reviewerLabel} — {tie.reviewerName}
              </p>
              <p className="font-bengali mt-1 whitespace-pre-wrap text-xs text-slate-700">
                {tie.reviewerNote ?? "No note submitted."}
              </p>
            </div>
          </div>
          {tie.votes.length > 0 ? (
            <details className="border-t border-amber-200 bg-white/60 px-4 py-2.5">
              <summary className="cursor-pointer text-xs font-semibold text-amber-900">
                Curator rationales ({tie.votes.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {tie.votes.map((v, i) => (
                  <li key={`${v.curator}-${i}`} className="rounded-lg bg-white px-3 py-2 text-xs ring-1 ring-inset ring-slate-200">
                    <p className="font-semibold text-slate-700">
                      {v.curator} —{" "}
                      <span className={v.verdict === "CONTRIBUTOR" ? "text-emerald-700" : "text-rose-600"}>
                        {v.verdict === "CONTRIBUTOR" ? "supports the contributor" : `supports the ${tie.reviewerLabel}`}
                      </span>
                    </p>
                    <p className="font-bengali mt-0.5 whitespace-pre-wrap text-slate-600">{v.rationale}</p>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <div className="space-y-1.5 border-t border-amber-200 px-4 py-3 text-xs">
            <p>
              Correct any field below, then choose <strong>Validate &amp; resolve tie</strong>. Every field is checked
              exactly as a new Quick Input entry. The entry moves straight to <strong>Validated</strong>, joins the
              lexicon and the case closes. If the entry is already correct, you can validate it without changes.
            </p>
            <p className="font-semibold text-red-700">
              🔒 Validation is final — the entry cannot be edited, withdrawn or overridden afterwards.
            </p>
          </div>
        </div>
      ) : src ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-semibold">
            ↻ Resubmitting entry <code className="font-mono">{src.id}</code> ·{" "}
            {STATE_LABEL[src.state] ?? src.state}
          </p>
          {src.feedback ? (
            <p className="font-bengali mt-1.5">
              <span className="font-semibold">
                {src.state === "C_FLAGGED" ? "Chief Lexical Editor note" : "Lexical Editor comment"}:
              </span>{" "}
              {src.feedback}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs text-sky-800">
            After resubmission the entry {src.targetState === "VALIDATED" ? "becomes" : "returns to"}{" "}
            <strong>{STATE_LABEL[src.targetState] ?? src.targetState}</strong>. Resubmit becomes
            available once you edit the entry.
          </p>
        </div>
      ) : null}
      {isModerator && !tie ? (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
          <p className="font-bold">⚡ Your entries are validated directly</p>
          <p className="mt-1 leading-relaxed">
            As {roleName}, anything you {src ? "resubmit" : "submit"} here skips the Lexical Editor and
            Chief Lexical Editor review. Its status becomes <strong>Validated</strong> immediately and it is
            added to the lexicon (search, linking, relations and XML export). All validation and duplicate
            checks still apply.
          </p>
          <p className="mt-2 rounded-lg border border-red-200 bg-white/70 px-3 py-2 text-xs font-semibold text-red-800">
            {`🔒 Validation is final — once an entry is Validated, its status cannot be changed or overridden, and it cannot be edited or withdrawn. Review every field carefully before you ${
              src ? "resubmit" : "submit"
            }.`}
          </p>
          {!src ? (
            <p className="mt-1 text-xs text-purple-800">
              Save as Draft keeps the entry private; it is validated when you submit the draft from My Submissions.
            </p>
          ) : null}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ {success}
        </div>
      ) : null}
      {formError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {formError}
        </div>
      ) : null}
      {allErrors.duplicate ? (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-bold">✕ Duplicate entry — cannot be saved</p>
          <p className="font-bengali mt-1">{allErrors.duplicate}</p>
        </div>
      ) : null}
      {nearDuplicate ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">⚠ Possible duplicate</p>
          <p className="font-bengali mt-1">{nearDuplicate}</p>
          <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={nearConfirmed}
              onChange={(e) => setConfirmedNear(e.target.checked ? nearDuplicate : null)}
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
            Bengali word (writtenForm) <span className="text-red-500">*</span>
          </label>
          <input
            value={word}
            onChange={(e) => {
              setWord(e.target.value);
              touch("writtenForm");
            }}
            onBlur={() => {
              setWord((w) => cleanWord(w));
              touch("writtenForm");
            }}
            placeholder="যেমন: মুঠোফোন"
            lang="bn"
            maxLength={WORD_MAX + 10}
            aria-invalid={Boolean(shownError("writtenForm")) || undefined}
            className={`font-bengali w-full rounded-xl border px-3 py-2.5 text-lg outline-none transition focus:ring-2 ${inputBorder("writtenForm")}`}
          />
          <p
            className={`mt-1 text-[11px] ${
              codePoints(cleanWord(word)) > WORD_MAX ? "font-semibold text-red-600" : "text-slate-400"
            }`}
          >
            Bengali letters only · no digits or symbols · max {WORD_MAX} characters ·{" "}
            {WORD_MAX - codePoints(cleanWord(word))} left
          </p>
          {fieldError("writtenForm")}
          {wordReady && validating && !serverFailed ? (
            <p className="mt-1 text-[11px] font-medium text-slate-400">Checking the database…</p>
          ) : null}
          {wordReady && serverFresh && !serverFailed && !allErrors.duplicate && !allErrors.writtenForm ? (
            <p className="mt-1 text-[11px] font-medium text-emerald-700">
              ✓ Checked against the lexicon and all submissions
            </p>
          ) : null}
        </div>

        {/* POS */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Part of speech <span className="text-red-500">*</span>
          </label>
          <select
            value={pos}
            onChange={(e) => {
              setPos(e.target.value);
              setSelectedSynset(null);
              touch("pos");
            }}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${inputBorder("pos")}`}
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
          Concept (Synset) linkage <span className="text-red-500">*</span>
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
                    setDefs((rows) => rows.filter((d) => d.text.trim() !== ""));
                  } else {
                    setDefs((rows) => (rows.length === 0 ? [newDefRow("ben")] : rows));
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
              placeholder="Search by Bengali word, synset ID, or definition…"
              endpoint="/api/lookup/synsets"
              posFilter={pos}
              keyOf={(h) => h.id}
              invalid={Boolean(shownError("synsetId"))}
              onSelect={(h) => {
                setSelectedSynset(h);
                touch("synsetId");
              }}
              selectedLabel={
                selectedSynset
                  ? `${selectedSynset.id} (${selectedSynset.pos}) — ${selectedSynset.words.join(", ") || "no words"} ${selectedSynset.definition ? `· ${selectedSynset.definition}` : ""}`
                  : undefined
              }
              onClear={() => {
                setSelectedSynset(null);
                touch("synsetId");
              }}
              render={(h) => (
                <span>
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {h.id}
                  </span>{" "}
                  <span className="rounded bg-slate-100 px-1 text-[10px] font-bold uppercase">
                    {h.pos}
                  </span>{" "}
                  <NewBadge origin={h.origin} />{" "}
                  <span className="font-bengali">{h.words.join(", ")}</span>
                  {h.definition ? (
                    <span className="font-bengali block text-xs text-slate-400">
                      {h.definition}
                    </span>
                  ) : null}
                </span>
              )}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Only concepts already in the lexicon (imported or validated) can be linked.
            </p>
            {fieldError("synsetId")}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                ILI code <span className="text-red-500">*</span>
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
                    touch("iliCode");
                  }}
                  className="mt-0.5 h-4 w-4 accent-emerald-700"
                />
                <span>
                  <span className="font-semibold text-slate-800">
                    N/A — ILI not available
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Select when no Princeton WordNet 3.0 concept applies yet.
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
                      touch("iliCode");
                    }}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200 transition hover:bg-red-50"
                  >
                    Clear N/A
                  </button>
                </div>
              ) : iliPicked && ili ? (
                <div
                  className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 ${
                    shownError("iliCode") ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"
                  }`}
                >
                  <code
                    className={`min-w-0 flex-1 font-mono text-sm font-bold ${
                      shownError("iliCode") ? "text-red-900" : "text-emerald-900"
                    }`}
                  >
                    {ili}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      setIli("");
                      setIliPicked(false);
                      touch("iliCode");
                    }}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200 transition hover:bg-red-50"
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
                    touch("iliCode");
                  }}
                  placeholder="ILI code, e.g. 04192858-n — or pick one below / select N/A"
                  aria-invalid={Boolean(shownError("iliCode")) || undefined}
                  className={`w-full rounded-xl border px-3 py-2.5 font-mono text-sm outline-none transition focus:ring-2 ${inputBorder("iliCode")}`}
                />
              )}
              <p className="mt-1 text-[11px] text-slate-400">
                {isIliNotAvailable(ili)
                  ? "This entry will be created without a WordNet ILI link."
                  : `Format: {8-digit-zero-padded-offset}-{n|v|a|r}. An ILI already in the lexicon or proposed by another entry cannot be created again — link to its synset instead${
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
                  touch("iliCode");
                }}
              />
            ) : null}
          </div>
        )}
        {fieldError("synsetAction")}
      </fieldset>

      {/* Definitions */}
      <fieldset
        className={`rounded-2xl border p-5 ${
          Object.keys(allErrors).some((k) => k.startsWith("definitions")) ? "border-red-200" : "border-slate-200"
        }`}
      >
        <legend className="px-2 text-sm font-bold text-slate-700">
          Definitions{" "}
          <span className="font-normal text-slate-400">
            (optional · one per language · {DEFINITION_MIN}–{DEFINITION_MAX} characters each)
          </span>
        </legend>

        {synsetAction === "link" ? (
          selectedSynset ? (
            existingDefs.length > 0 ? (
              <ul className="mb-3 space-y-2">
                {existingDefs.map((d) => (
                  <li
                    key={d.language}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
                  >
                    <span aria-hidden="true">🔒</span>
                    <LangBadge lang={d.language} />
                    <span lang={d.language === "eng" ? "en" : "bn"} className={`min-w-0 break-words ${d.language === "eng" ? "" : "font-bengali"}`}>
                      {d.text}
                    </span>
                  </li>
                ))}
                <li className="text-[11px] text-slate-400">
                  Existing definitions of {selectedSynset.id} are locked.
                  {existingDefs.length >= DEF_LANGS.length
                    ? " It already has a definition in every supported language."
                    : " You can add a definition in a language it does not have yet."}
                </li>
              </ul>
            ) : (
              <p className="mb-3 text-xs text-slate-500">
                {selectedSynset.id} has no definition yet. You can add one in each language.
              </p>
            )
          ) : (
            <p className="mb-3 text-xs text-slate-400">Select a synset to see its definitions.</p>
          )
        ) : null}

        <div className="space-y-3">
          {defs.map((row, i) => {
            const sentIndex = sentIndexByKey.get(row.key);
            const rowError = sentIndex !== undefined ? shownError(`definitions.${sentIndex}`) : null;
            const options = Array.from(new Set<DefLang>([row.language, ...freeLanguages(row.key)])).sort(
              (a, b) => DEF_LANGS.indexOf(a) - DEF_LANGS.indexOf(b)
            );
            return (
              <div key={row.key} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600" htmlFor={`def-lang-${row.key}`}>
                    Definition {i + 1} language
                  </label>
                  <select
                    id={`def-lang-${row.key}`}
                    value={row.language}
                    onChange={(e) => {
                      const language = e.target.value as DefLang;
                      setDefs((rows) => rows.map((d) => (d.key === row.key ? { ...d, language } : d)));
                      touch("definitions");
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  >
                    {options.map((l) => (
                      <option key={l} value={l}>
                        {DEF_LANG_LABEL[l]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setDefs((rows) => rows.filter((d) => d.key !== row.key));
                      touch("definitions");
                    }}
                    className="ml-auto rounded-lg px-2 py-1 text-xs font-bold text-red-600 ring-1 ring-inset ring-red-200 transition hover:bg-red-50"
                    aria-label={`Remove definition ${i + 1}`}
                  >
                    ✕ Remove
                  </button>
                </div>
                <textarea
                  value={row.text}
                  onChange={(e) => {
                    const text = e.target.value;
                    setDefs((rows) => rows.map((d) => (d.key === row.key ? { ...d, text } : d)));
                    touch("definitions");
                  }}
                  maxLength={DEFINITION_MAX + 50}
                  rows={3}
                  lang={row.language === "eng" ? "en" : "bn"}
                  placeholder={
                    row.language === "eng" ? "Write the definition in English…" : "ধারণাটির সংজ্ঞা বাংলায় লিখুন…"
                  }
                  aria-invalid={Boolean(rowError) || undefined}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                    row.language === "eng" ? "" : "font-bengali"
                  } ${
                    rowError
                      ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-200"
                      : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                />
                <div className="mt-1 flex items-start justify-between gap-3">
                  {rowError ? (
                    <p role="alert" className="flex items-start gap-1 text-xs font-medium text-red-600">
                      <span aria-hidden="true">⚠</span>
                      <span>{rowError}</span>
                    </p>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {row.text.trim() ? "" : "Optional — leave empty to skip this definition."}
                    </span>
                  )}
                  {row.text.trim() ? (
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {codePoints(row.text.trim())}/{DEFINITION_MAX}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {canAddDefinition ? (
          <button
            type="button"
            onClick={() => {
              const [language] = freeLanguages(null);
              if (!language) return;
              setDefs((rows) => [...rows, newDefRow(language)]);
              touch("definitions");
            }}
            className="mt-3 rounded-lg border border-dashed border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            + Add definition
          </button>
        ) : null}
        {fieldError("definitions")}
      </fieldset>

      {/* Relations */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Sense relations */}
        <fieldset
          className={`rounded-2xl border p-5 ${
            Object.keys(allErrors).some((k) => k.startsWith("senseRelations"))
              ? "border-red-200"
              : "border-slate-200"
          }`}
        >
          <legend className="px-2 text-sm font-bold text-slate-700">
            Sense relations{" "}
            <span className="font-normal text-slate-400">
              (optional · each word sense once · max {RELATIONS_MAX})
            </span>
          </legend>
          <div className="space-y-3">
            {senseRels.map((rel, i) => {
              const rowError = shownError(`senseRelations.${i}`);
              const used = usedSenseTargets(i);
              return (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <select
                      value={rel.relType}
                      onChange={(e) =>
                        setSenseRels((rs) =>
                          rs.map((r, j) => (j === i ? { ...r, relType: e.target.value } : r))
                        )
                      }
                      aria-label={`Sense relation ${i + 1} type`}
                      className="w-32 shrink-0 rounded-lg border border-slate-300 px-2 py-2 text-xs"
                    >
                      {SENSE_REL_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div className="min-w-0 flex-1">
                      {rel.target ? (
                        <div
                          className={`flex min-w-0 flex-1 items-center gap-1 rounded-lg px-2 py-1.5 ring-1 ring-inset ${
                            rowError ? "bg-red-50 ring-red-300" : "bg-emerald-50 ring-emerald-200"
                          }`}
                        >
                          <span
                            className={`font-bengali min-w-0 flex-1 truncate text-xs font-semibold ${
                              rowError ? "text-red-900" : "text-emerald-900"
                            }`}
                          >
                            {rel.label}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSenseRels((rs) =>
                                rs.map((r, j) => (j === i ? { ...r, target: "", label: "" } : r))
                              )
                            }
                            className="shrink-0 text-[10px] font-bold text-emerald-700 hover:text-red-600"
                          >
                            change
                          </button>
                        </div>
                      ) : (
                        <Autocomplete<WordHit>
                          placeholder="Search Bengali word for sense target…"
                          endpoint="/api/lookup/words"
                          keyOf={(h) => h.senseId}
                          invalid={Boolean(rowError)}
                          disabledReason={(h) =>
                            used.has(h.senseId) ? `Already used in row ${used.get(h.senseId)! + 1}` : null
                          }
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
                              <span className="rounded bg-slate-100 px-1 text-[10px] font-bold uppercase">
                                {h.pos}
                              </span>{" "}
                              <NewBadge origin={h.origin} />{" "}
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
                      className="shrink-0 text-slate-400 hover:text-red-600"
                      aria-label={`Remove sense relation ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                  {fieldError(`senseRelations.${i}`)}
                </div>
              );
            })}
            <button
              type="button"
              disabled={senseRels.length >= RELATIONS_MAX}
              onClick={() =>
                setSenseRels((rs) => [...rs, { relType: "derivation", target: "", label: "" }])
              }
              className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add sense relation
            </button>
            {fieldError("senseRelations")}
          </div>
        </fieldset>

        {/* Synset relations */}
        <fieldset
          className={`rounded-2xl border p-5 ${
            Object.keys(allErrors).some((k) => k.startsWith("synsetRelations"))
              ? "border-red-200"
              : "border-slate-200"
          }`}
        >
          <legend className="px-2 text-sm font-bold text-slate-700">
            Synset relations{" "}
            <span className="font-normal text-slate-400">
              (optional · each concept once · max {RELATIONS_MAX})
            </span>
          </legend>
          <div className="space-y-3">
            {synsetRels.map((rel, i) => {
              const rowError = shownError(`synsetRelations.${i}`);
              const used = usedSynsetTargets(i);
              const linkedId = synsetAction === "link" ? selectedSynset?.id : undefined;
              return (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <select
                      value={rel.relType}
                      onChange={(e) =>
                        setSynsetRels((rs) =>
                          rs.map((r, j) => (j === i ? { ...r, relType: e.target.value } : r))
                        )
                      }
                      aria-label={`Synset relation ${i + 1} type`}
                      className="w-32 shrink-0 rounded-lg border border-slate-300 px-2 py-2 text-xs"
                    >
                      {SYNSET_REL_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div className="min-w-0 flex-1">
                      {rel.target ? (
                        <div
                          className={`flex min-w-0 flex-1 items-center gap-1 rounded-lg px-2 py-1.5 ring-1 ring-inset ${
                            rowError ? "bg-red-50 ring-red-300" : "bg-emerald-50 ring-emerald-200"
                          }`}
                        >
                          <span
                            className={`font-bengali min-w-0 flex-1 truncate text-xs font-semibold ${
                              rowError ? "text-red-900" : "text-emerald-900"
                            }`}
                          >
                            {rel.label}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSynsetRels((rs) =>
                                rs.map((r, j) => (j === i ? { ...r, target: "", label: "" } : r))
                              )
                            }
                            className="shrink-0 text-[10px] font-bold text-emerald-700 hover:text-red-600"
                          >
                            change
                          </button>
                        </div>
                      ) : (
                        <Autocomplete<SynsetHit>
                          placeholder="Search by word, synset ID, or definition…"
                          endpoint="/api/lookup/synsets"
                          keyOf={(h) => h.id}
                          invalid={Boolean(rowError)}
                          disabledReason={(h) =>
                            h.id === linkedId
                              ? "This is the synset your word is linked to"
                              : used.has(h.id)
                                ? `Already used in row ${used.get(h.id)! + 1}`
                                : null
                          }
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
                              <span className="rounded bg-slate-100 px-1 text-[10px] font-bold uppercase">
                                {h.pos}
                              </span>{" "}
                              <NewBadge origin={h.origin} />{" "}
                              <span className="font-bengali">{h.words.join(", ")}</span>
                              {h.definition ? (
                                <span className="font-bengali block text-xs text-slate-400">
                                  {h.definition}
                                </span>
                              ) : null}
                            </span>
                          )}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSynsetRels((rs) => rs.filter((_, j) => j !== i))}
                      className="shrink-0 text-slate-400 hover:text-red-600"
                      aria-label={`Remove synset relation ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                  {fieldError(`synsetRelations.${i}`)}
                </div>
              );
            })}
            <button
              type="button"
              disabled={synsetRels.length >= RELATIONS_MAX}
              onClick={() =>
                setSynsetRels((rs) => [...rs, { relType: "hypernym", target: "", label: "" }])
              }
              className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add synset relation
            </button>
            {fieldError("synsetRelations")}
          </div>
        </fieldset>
      </div>

      {/* Direct-validating roles have no reviewer to address. */}
      {!isModerator ? (
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Notes for reviewers{" "}
            <span className="font-normal text-slate-400">
              (optional — internal, never exported to XML · max {NOTE_MAX})
            </span>
          </label>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              touch("reviewerNote");
            }}
            maxLength={NOTE_MAX + 50}
            rows={2}
            aria-invalid={Boolean(shownError("reviewerNote")) || undefined}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${inputBorder("reviewerNote")}`}
          />
          {fieldError("reviewerNote")}
        </div>
      ) : null}

      {checkboxRequired ? (
        <label
          className={`flex w-fit cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm ${
            captcha ? "border-emerald-300" : "border-slate-300"
          }`}
        >
          <input
            type="checkbox"
            checked={captcha}
            onChange={(e) => {
              setCaptcha(e.target.checked);
              setFormError(null);
            }}
            className="h-5 w-5 accent-emerald-700"
          />
          <span className="text-sm font-medium text-slate-700">
            I&apos;m not a robot
          </span>
        </label>
      ) : recaptchaKey ? (
        <p className="text-[11px] leading-relaxed text-slate-400">
          This form is protected by reCAPTCHA. The Google{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">
            Terms of Service
          </a>{" "}
          apply.
        </p>
      ) : null}

      <div className="space-y-3 border-t border-slate-100 pt-5">
        {blockers.length > 0 || validating ? (
          <div
            aria-live="polite"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs"
          >
            <p className="font-semibold text-slate-700">
              {blockers.length > 0
                ? `${
                    tie
                      ? "Validate & resolve tie"
                      : src
                      ? isModerator ? "Resubmit & Validate" : "Resubmit"
                      : isModerator ? "Submit & Validate and Save as Draft" : "Submit and Save as Draft"
                  } will be enabled when:`
                : "Checking the entry against the database…"}
            </p>
            {blockers.length > 0 ? (
              <ul className="mt-1.5 space-y-1">
                {blockers.map((b) => (
                  <li key={b.key} className="font-bengali flex items-start gap-1.5 text-red-600">
                    <span aria-hidden="true">•</span>
                    <span>{b.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {serverFailed ? (
              <button
                type="button"
                onClick={() => setRetryTick((t) => t + 1)}
                className="mt-2 rounded-lg bg-white px-3 py-1.5 font-bold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
              >
                Retry check
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-xs font-semibold text-emerald-700">
            {tie
              ? `✓ All checks passed — ready to validate and resolve the tie${
                  hasChanges ? "" : " (no fields changed)"
                }.`
              : `✓ All checks passed — ready to ${src ? "resubmit" : "submit"}${
                  isModerator ? " and validate directly" : ""
                }.`}
          </p>
        )}

        {tie && src ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-amber-600 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-amber-600"
            >
              {busy ? "Validating…" : "⚖ Validate & resolve tie"}
            </button>
            <Link
              href={`/dashboard/arbitration/${encodeURIComponent(tie.caseId)}`}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        ) : src ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-emerald-700 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-700"
            >
              {busy ? "Resubmitting…" : isModerator ? "⚡ Resubmit & Validate" : "↻ Resubmit"}
            </button>
            <Link
              href={`/dashboard/submissions/${encodeURIComponent(src.id)}`}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-emerald-700 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-700"
            >
              {busy ? "Submitting…" : isModerator ? "⚡ Submit & Validate" : "Submit for Review"}
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => requestSubmit(true)}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              Save as Draft
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
