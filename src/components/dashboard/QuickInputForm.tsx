"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ILI_NOT_AVAILABLE, isIliNotAvailable, normalizeIliCode } from "@/lib/ili";
import Link from "next/link";
import { POS_LABEL, STATE_LABEL } from "@/lib/format";
import type { EntryState, POS, Role } from "@/lib/types";
import { IliFinder } from "@/components/dashboard/IliFinder";
import { StateBadge } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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

function Autocomplete<T>({
  placeholder,
  endpoint,
  render,
  keyOf,
  onSelect,
  selectedLabel,
  onClear,
  posFilter,
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
      {loading && queryReady ? (
        <p className="mt-1 text-[11px] text-slate-400">Searching lexicon…</p>
      ) : null}
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
      {open && queryReady && !loading && visibleHits.length === 0 ? (
        <p className="mt-1 text-[11px] text-slate-400">No matches in the lexicon.</p>
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

const BENGALI_RE = /[\u0980-\u09ff]/;
const ILI_RE = /^\d{8}-[nvar]$/;

const quickInputClientSchema = z.object({
  writtenForm: z
    .string()
    .trim()
    .min(1, "Bengali word is required.")
    .max(25, "Maximum 25 characters allowed.")
    .refine((v) => BENGALI_RE.test(v), {
      message: "Must contain at least one Bengali Unicode character (U+0980–U+09FF).",
    }),
  pos: z.enum(["n", "v", "a", "r"], { message: "Part of speech is required." }),
  synsetAction: z.enum(["link", "create"]),
  definitionText: z.string().max(500, "Definition must be at most 500 characters.").optional(),
  reviewerNote: z.string().max(500, "Note must be at most 500 characters.").optional(),
});

interface RelRow {
  relType: string;
  target: string;
  label: string;
}

function relationErrors(
  senseRels: RelRow[],
  synsetRels: RelRow[],
  linkedSynsetId: string | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  const seenSense = new Set<string>();
  senseRels.forEach((r, i) => {
    if (out.senseRelations) return;
    if (!r.target) {
      out.senseRelations = `Sense relation #${i + 1}: pick a target word from search, or remove the row.`;
    } else if (seenSense.has(`${r.relType}|${r.target}`)) {
      out.senseRelations = `Sense relation #${i + 1} is a duplicate of an earlier row.`;
    }
    seenSense.add(`${r.relType}|${r.target}`);
  });
  const seenSyn = new Set<string>();
  synsetRels.forEach((r, i) => {
    if (out.synsetRelations) return;
    if (!r.target) {
      out.synsetRelations = `Synset relation #${i + 1}: pick a target synset from search, or remove the row.`;
    } else if (linkedSynsetId && r.target === linkedSynsetId) {
      out.synsetRelations = `Synset relation #${i + 1} points to the same synset this word is linked to.`;
    } else if (seenSyn.has(`${r.relType}|${r.target}`)) {
      out.synsetRelations = `Synset relation #${i + 1} is a duplicate of an earlier row.`;
    }
    seenSyn.add(`${r.relType}|${r.target}`);
  });
  return out;
}

/** A FLAGGED / C_FLAGGED entry loaded into the form for correction and resubmission. */
export interface ResubmissionSource {
  id: string;
  version: number | null;
  state: "FLAGGED" | "C_FLAGGED";
  targetState: EntryState;
  feedback: string | null;
  writtenForm: string;
  pos: string;
  synsetAction: "link" | "create";
  synset: SynsetHit | null;
  iliCode: string | null;
  definitionLanguage: "ben" | "eng";
  definitionText: string;
  reviewerNote: string;
  senseRelations: RelRow[];
  synsetRelations: RelRow[];
}

export function QuickInputForm({
  role,
  resubmission,
}: {
  role: Role;
  resubmission?: ResubmissionSource;
}) {
  const router = useRouter();
  const [mountedAt] = useState(() => Date.now());
  const mountedAtRef = useRef(mountedAt);
  /** Same key for retries / double-clicks of one entry; renewed only after a successful submit. */
  const idempotencyKeyRef = useRef<string | null>(null);
  const src = resubmission;

  const [word, setWord] = useState(src?.writtenForm ?? "");
  const [pos, setPos] = useState(src?.pos ?? "n");
  const [synsetAction, setSynsetAction] = useState<"link" | "create">(src?.synsetAction ?? "link");
  const [selectedSynset, setSelectedSynset] = useState<SynsetHit | null>(src?.synset ?? null);
  const [ili, setIli] = useState(normalizeIliCode(src?.iliCode));
  /** After “Use this code”, the finder is hidden until Discard. */
  const [iliPicked, setIliPicked] = useState(Boolean(src?.iliCode));
  const [defLang, setDefLang] = useState<"ben" | "eng">(src?.definitionLanguage ?? "ben");
  const [defText, setDefText] = useState(src?.definitionText ?? "");
  const [senseRels, setSenseRels] = useState<RelRow[]>(src?.senseRelations ?? []);
  const [synsetRels, setSynsetRels] = useState<RelRow[]>(src?.synsetRelations ?? []);
  const [note, setNote] = useState(src?.reviewerNote ?? "");
  const [resubmitted, setResubmitted] = useState<{ id: string; state: EntryState } | null>(null);
  const [captcha, setCaptcha] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [directApprove, setDirectApprove] = useState(false);
  const [justification, setJustification] = useState("");
  const [confirmNearDup, setConfirmNearDup] = useState(false);
  const [nearDupMessage, setNearDupMessage] = useState<string | null>(null);
  /** Errors from the server (live validate / submit) and submit-time checks. */
  const [serverErrors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    kind: "submit" | "draft" | "resubmit";
    entry: Record<string, unknown>;
  } | null>(null);

  const isModerator =
    role === "SYSTEM_MODERATOR" || role === "PLATFORM_ARCHITECT";
  const lockedDefinition =
    synsetAction === "link" && selectedSynset?.definition ? true : false;

  /** Resubmission only: whether any field differs from the loaded entry (mirrors the server's change check). */
  const hasChanges = useMemo(() => {
    if (!src) return true;
    const relKey = (rows: RelRow[]) =>
      rows
        .filter((r) => r.target)
        .map((r) => `${r.relType}|${r.target}`)
        .sort()
        .join(",");
    const definition = lockedDefinition ? "" : defText.trim();
    const initialDefinition = src.definitionText.trim();
    return (
      word.trim() !== src.writtenForm.trim() ||
      pos !== src.pos ||
      synsetAction !== src.synsetAction ||
      (synsetAction === "link" && (selectedSynset?.id ?? "") !== (src.synset?.id ?? "")) ||
      (synsetAction === "create" &&
        normalizeIliCode(ili).toLowerCase() !== normalizeIliCode(src.iliCode).toLowerCase()) ||
      definition !== initialDefinition ||
      (definition !== "" && defLang !== src.definitionLanguage) ||
      relKey(senseRels) !== relKey(src.senseRelations) ||
      relKey(synsetRels) !== relKey(src.synsetRelations) ||
      note.trim() !== src.reviewerNote.trim()
    );
  }, [src, word, pos, synsetAction, selectedSynset, ili, defText, defLang, lockedDefinition, senseRels, synsetRels, note]);

  const debouncedWord = useDebounced(word.trim(), 400);
  const debouncedIli = useDebounced(ili.trim(), 400);

  /** Client-side Zod errors, derived on every render so they appear immediately. */
  const clientErrors = useMemo(() => {
    const local: Record<string, string> = {};

    if (debouncedWord) {
      const wordOnly = z
        .object({ writtenForm: quickInputClientSchema.shape.writtenForm })
        .safeParse({ writtenForm: debouncedWord });
      if (!wordOnly.success) {
        local.writtenForm = wordOnly.error.issues[0]?.message ?? "Invalid word.";
      }
    }

    const extras = z
      .object({
        definitionText: quickInputClientSchema.shape.definitionText,
        reviewerNote: quickInputClientSchema.shape.reviewerNote,
      })
      .safeParse({
        definitionText: defText.trim() || undefined,
        reviewerNote: note.trim() || undefined,
      });
    if (!extras.success) {
      for (const issue of extras.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!local[key]) local[key] = issue.message;
      }
    }

    if (synsetAction === "link" && selectedSynset && selectedSynset.pos !== pos) {
      local.synsetId = `POS mismatch: selected synset is "${selectedSynset.pos}" but the lemma is "${pos}".`;
    }
    if (synsetAction === "create" && debouncedIli && !isIliNotAvailable(debouncedIli)) {
      if (!ILI_RE.test(debouncedIli)) {
        local.iliCode =
          "ILI code must follow the format {8-digit-offset}-{n|v|a|r}, e.g. 04192858-n — or select N/A.";
      } else if (!debouncedIli.endsWith(pos)) {
        local.iliCode = "ILI code POS suffix must match the selected part of speech.";
      }
    }
    if (defLang === "ben" && defText.trim() && !BENGALI_RE.test(defText)) {
      local.definitionText =
        "Bengali definitions must contain Bengali script characters.";
    }

    // Relation rows are only checked once a target is picked, so a fresh empty row isn't red.
    Object.assign(
      local,
      relationErrors(
        senseRels.filter((r) => r.target),
        synsetRels.filter((r) => r.target),
        synsetAction === "link" ? selectedSynset?.id : undefined
      )
    );
    return local;
  }, [
    debouncedWord,
    debouncedIli,
    pos,
    synsetAction,
    selectedSynset,
    defText,
    defLang,
    note,
    senseRels,
    synsetRels,
  ]);

  const errors = useMemo(
    () => ({ ...serverErrors, ...clientErrors }),
    [serverErrors, clientErrors]
  );

  /** Server-side duplicate / linkage / ILI validation against the full lexicon. */
  useEffect(() => {
    if (!debouncedWord || clientErrors.writtenForm) return;
    const readyForServer =
      (synsetAction === "link" && !!selectedSynset) ||
      (synsetAction === "create" && !!debouncedIli);
    if (!readyForServer) return;

    let cancelled = false;
    fetch("/api/lookup/validate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writtenForm: debouncedWord,
        pos,
        synsetAction,
        synsetId: synsetAction === "link" ? selectedSynset?.id : undefined,
        iliCode:
          synsetAction === "create"
            ? isIliNotAvailable(debouncedIli)
              ? ILI_NOT_AVAILABLE
              : debouncedIli
            : undefined,
        confirmNearDuplicate: confirmNearDup,
        excludeSubmissionId: src?.id,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setErrors((prev) => {
          const n = { ...prev };
          delete n.duplicate;
          delete n.synsetId;
          delete n.iliCode;
          delete n.writtenForm;
          return data.errors && typeof data.errors === "object"
            ? { ...n, ...data.errors }
            : n;
        });
        if (data.nearDuplicate) {
          setNearDupMessage(data.nearDuplicate);
        } else if (!data.errors?.duplicate) {
          setNearDupMessage(null);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    debouncedWord,
    debouncedIli,
    pos,
    synsetAction,
    selectedSynset,
    confirmNearDup,
    clientErrors.writtenForm,
    src?.id,
  ]);

  /** Validates the form; returns the payload, or null after showing the errors. */
  function prepare(saveAsDraft: boolean): Record<string, unknown> | null {
    setSuccess(null);

    const client = quickInputClientSchema.safeParse({
      writtenForm: word.trim(),
      pos,
      synsetAction,
      definitionText: lockedDefinition ? undefined : defText.trim() || undefined,
      reviewerNote: note.trim() || undefined,
    });
    const preErrors: Record<string, string> = {};
    if (!client.success) {
      for (const issue of client.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!preErrors[key]) preErrors[key] = issue.message;
      }
    }
    if (synsetAction === "link" && !selectedSynset) {
      preErrors.synsetId = "Select an existing synset from search.";
    }
    if (synsetAction === "link" && selectedSynset && selectedSynset.pos !== pos) {
      preErrors.synsetId = `POS mismatch: selected synset is "${selectedSynset.pos}" but the lemma is "${pos}".`;
    }
    if (synsetAction === "create") {
      if (!ili.trim()) {
        preErrors.iliCode = "Enter an ILI code or select N/A.";
      } else if (!isIliNotAvailable(ili) && !ILI_RE.test(ili.trim())) {
        preErrors.iliCode =
          "ILI code must follow the format {8-digit-offset}-{n|v|a|r}, e.g. 04192858-n — or select N/A.";
      } else if (!isIliNotAvailable(ili) && !ili.trim().endsWith(pos)) {
        preErrors.iliCode = "ILI code POS suffix must match the selected part of speech.";
      }
    }
    if (defLang === "ben" && defText.trim() && !BENGALI_RE.test(defText) && !lockedDefinition) {
      preErrors.definitionText =
        "Bengali definitions must contain Bengali script characters.";
    }
    Object.assign(
      preErrors,
      relationErrors(
        senseRels,
        synsetRels,
        synsetAction === "link" ? selectedSynset?.id : undefined
      )
    );
    if (isModerator && directApprove && justification.trim().length < 20) {
      preErrors.directApproveJustification =
        "Direct approval requires a written justification of at least 20 characters.";
    }
    if (!isModerator && !saveAsDraft && !captcha) {
      preErrors.captcha = "Please complete the CAPTCHA verification.";
    }
    if (Object.keys(preErrors).length > 0) {
      setErrors(preErrors);
      return null;
    }

    return {
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
    };
  }

  /** Validates, then asks for confirmation before anything is sent. */
  function requestSubmit(saveAsDraft: boolean) {
    const entry = prepare(saveAsDraft);
    if (!entry) return;
    setPending({ kind: src ? "resubmit" : saveAsDraft ? "draft" : "submit", entry });
  }

  async function confirmPending() {
    if (!pending) return;
    const { kind, entry } = pending;
    setBusy(true);
    try {
      if (kind === "resubmit") {
        await resubmit(entry);
      } else {
        await submit(entry, kind === "draft");
      }
    } finally {
      setPending(null);
    }
  }

  async function submit(entry: Record<string, unknown>, saveAsDraft: boolean) {
    idempotencyKeyRef.current ??= newIdempotencyKey();
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          ...entry,
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
      idempotencyKeyRef.current = null;
      setErrors({});
      setNearDupMessage(null);
      setSuccess(
        !data.id
          ? "Submission received."
          : saveAsDraft
          ? `Saved as draft (${data.id}). You can edit it from My Submissions.`
          : data.state === "VALIDATED"
            ? `Entry ${data.id} submitted and marked Validated.`
            : data.state === "UNDER_REVIEW"
              ? `Entry ${data.id} is held Under Review for a security check. A System Moderator will clear it shortly.`
              : `Entry ${data.id} submitted — it is now Pending Review in the Lexical Editor's queue.`
      );
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
    } catch {
      setErrors({ form: "Network error — the entry was not submitted. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function resubmit(entry: Record<string, unknown>) {
    if (!src) return;
    try {
      const res = await fetch(`/api/submissions/${encodeURIComponent(src.id)}/resubmit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...entry,
          captchaPassed: captcha,
          confirmNearDuplicate: confirmNearDup,
          expectedVersion: src.version ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.nearDuplicate) {
        setNearDupMessage(data.nearDuplicate);
        return;
      }
      if (!res.ok) {
        setErrors(data.errors ?? { form: data.error ?? "Resubmission failed. Please try again." });
        return;
      }
      setErrors({});
      setNearDupMessage(null);
      setResubmitted({ id: data.id ?? src.id, state: data.state ?? src.targetState });
    } catch {
      setErrors({ form: "Network error — the entry was not resubmitted. Please try again." });
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
    const who = word.trim() ? `“${word.trim()}”` : "This entry";
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
        description: `${who} will be saved as a Draft. It is not sent for review until you submit it from My Submissions.`,
        confirmLabel: "Save draft",
        toState: "DRAFT",
      };
    }
    if (isModerator && directApprove) {
      return {
        title: "Submit and validate directly?",
        description: `${who} will be added and marked Validated immediately, skipping the review queues. Your justification is recorded in the audit trail.`,
        confirmLabel: "Submit & validate",
        toState: "VALIDATED",
      };
    }
    return {
      title: "Submit for review?",
      description: `${who} will be submitted for review. Its status will be Pending Review and it will wait in the Lexical Editor's review queue. You can follow its progress in My Submissions.`,
      confirmLabel: "Yes, submit for review",
      toState: "PENDING_REVIEW",
    };
  })();

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-xs font-medium text-rose-600">{errors[key]}</p>
    ) : null;

  const inputBorder = (key: string) =>
    errors[key]
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
      : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200";

  if (resubmitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="font-bold">✓ Entry {resubmitted.id} resubmitted.</p>
          <p className="mt-1">
            Status changed to {STATE_LABEL[resubmitted.state] ?? resubmitted.state}
            {resubmitted.state === "EDITOR_APPROVED"
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
        if (busy || (src && !hasChanges)) return;
        requestSubmit(false);
      }}
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
        <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-inset ring-slate-200">
          <dt className="text-slate-400">Word</dt>
          <dd className="font-bengali col-span-2 font-bold text-slate-900">{word.trim()}</dd>
          <dt className="text-slate-400">Part of speech</dt>
          <dd className="col-span-2 text-slate-700">{POS_LABEL[pos as POS] ?? pos}</dd>
          <dt className="text-slate-400">New status</dt>
          <dd className="col-span-2">
            <StateBadge state={confirmCopy.toState} />
          </dd>
        </dl>
      </ConfirmModal>
      {src ? (
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
            After resubmission the entry returns to{" "}
            <strong>{STATE_LABEL[src.targetState] ?? src.targetState}</strong>. Resubmit becomes
            available once you edit the entry.
          </p>
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ {success}
        </div>
      ) : null}
      {errors.form || errors.captcha || errors.duplicate ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {errors.form ?? errors.captcha ?? errors.duplicate}
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
            onChange={(e) => {
              setWord(e.target.value);
              setErrors((prev) => {
                const n = { ...prev };
                delete n.writtenForm;
                delete n.duplicate;
                return n;
              });
            }}
            onBlur={() => setWord((w) => w.trim())}
            placeholder="যেমন: মুঠোফোন"
            lang="bn"
            maxLength={25}
            className={`font-bengali w-full rounded-xl border px-3 py-2.5 text-lg outline-none transition focus:ring-2 ${inputBorder("writtenForm")}`}
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
              setErrors((prev) => {
                const n = { ...prev };
                delete n.pos;
                delete n.synsetId;
                delete n.iliCode;
                delete n.duplicate;
                return n;
              });
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
              placeholder="Search by Bengali word, synset ID, or definition…"
              endpoint="/api/lookup/synsets"
              posFilter={pos}
              keyOf={(h) => h.id}
              onSelect={(h) => {
                setSelectedSynset(h);
                setErrors((prev) => {
                  const n = { ...prev };
                  delete n.synsetId;
                  delete n.duplicate;
                  return n;
                });
              }}
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
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.iliCode;
                      delete n.duplicate;
                      return n;
                    });
                  }}
                  placeholder="ILI code, e.g. 04192858-n — or pick one below / select N/A"
                  className={`w-full rounded-xl border px-3 py-2.5 font-mono text-sm outline-none transition focus:ring-2 ${inputBorder("iliCode")}`}
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
                The selected synset already has a definition — field locked.
              </span>
            </div>
          ) : (
            <textarea
              value={defText}
              onChange={(e) => {
                setDefText(e.target.value);
                setErrors((prev) => {
                  const n = { ...prev };
                  delete n.definitionText;
                  return n;
                });
              }}
              maxLength={500}
              rows={3}
              lang="bn"
              placeholder="ধারণাটির সংজ্ঞা লিখুন…"
              className={`font-bengali w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${inputBorder("definitionText")}`}
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
                    <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 ring-1 ring-inset ring-emerald-200">
                      <span className="font-bengali min-w-0 flex-1 truncate text-xs font-semibold text-emerald-900">
                        {rel.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSenseRels((rs) =>
                            rs.map((r, j) =>
                              j === i ? { ...r, target: "", label: "" } : r
                            )
                          )
                        }
                        className="shrink-0 text-[10px] font-bold text-emerald-700 hover:text-rose-600"
                      >
                        change
                      </button>
                    </div>
                  ) : (
                    <Autocomplete<WordHit>
                      placeholder="Search Bengali word for sense target…"
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
                          <span className="rounded bg-slate-100 px-1 text-[10px] font-bold uppercase">
                            {h.pos}
                          </span>{" "}
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
            {fieldError("senseRelations")}
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
                    <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 ring-1 ring-inset ring-emerald-200">
                      <span className="font-bengali min-w-0 flex-1 truncate text-xs font-semibold text-emerald-900">
                        {rel.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSynsetRels((rs) =>
                            rs.map((r, j) =>
                              j === i ? { ...r, target: "", label: "" } : r
                            )
                          )
                        }
                        className="shrink-0 text-[10px] font-bold text-emerald-700 hover:text-rose-600"
                      >
                        change
                      </button>
                    </div>
                  ) : (
                    <Autocomplete<SynsetHit>
                      placeholder="Search by word, synset ID, or definition…"
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
            {fieldError("synsetRelations")}
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
      {isModerator && !src ? (
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
                onChange={(e) => {
                  const v = e.target.value;
                  setJustification(v);
                  setErrors((prev) => {
                    const n = { ...prev };
                    if (v.trim().length > 0 && v.trim().length < 20) {
                      n.directApproveJustification = `Justification needs at least 20 characters (${v.trim().length}/20).`;
                    } else {
                      delete n.directApproveJustification;
                    }
                    return n;
                  });
                }}
                rows={2}
                placeholder="Mandatory written justification (minimum 20 characters)…"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                  errors.directApproveJustification
                    ? "border-rose-400 focus:ring-rose-200"
                    : "border-purple-300 focus:ring-purple-200"
                }`}
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
            onChange={(e) => {
              setCaptcha(e.target.checked);
              setErrors((prev) => {
                const n = { ...prev };
                delete n.captcha;
                return n;
              });
            }}
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

      {src ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={busy || !hasChanges}
            title={hasChanges ? undefined : "Edit the entry to enable Resubmit"}
            className="rounded-xl bg-emerald-700 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-700"
          >
            {busy ? "Resubmitting…" : "↻ Resubmit"}
          </button>
          <Link
            href={`/dashboard/submissions/${encodeURIComponent(src.id)}`}
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      ) : (
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-emerald-700 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy
            ? "Submitting…"
            : isModerator && directApprove
              ? "Submit & Validate directly"
              : "Submit for Review"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => requestSubmit(true)}
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Save as Draft
        </button>
        <p className="text-[11px] text-slate-400">
          Server checks: honeypot → timing (too fast → UNDER_REVIEW) → CAPTCHA →
          duplicate detection.
        </p>
      </div>
      )}
    </form>
  );
}
