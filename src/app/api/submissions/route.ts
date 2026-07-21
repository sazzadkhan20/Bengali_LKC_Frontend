import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { isKnownIli, synsetById } from "@/lib/lexicon";
import { isValidWn21Ili } from "@/lib/wordnet21";
import { recordAudit, store, transitionSubmission } from "@/lib/store";
import type { SenseRelation, Submission, SynsetRelation } from "@/lib/types";

const BENGALI_RE = /[\u0980-\u09ff]/;

interface QuickInputPayload {
  writtenForm?: string;
  pos?: string;
  synsetAction?: "link" | "create";
  synsetId?: string;
  iliCode?: string;
  definitionLanguage?: "ben" | "eng";
  definitionText?: string;
  senseRelations?: SenseRelation[];
  synsetRelations?: SynsetRelation[];
  reviewerNote?: string;
  /* anti-bot fields (SRS §4.3) */
  honeypot?: string;
  elapsedSeconds?: number;
  captchaPassed?: boolean;
  /* near-duplicate confirmation (SRS §6.4) */
  confirmNearDuplicate?: boolean;
  /* System Moderator direct approval (SRS §7.2.2) */
  directApprove?: boolean;
  directApproveJustification?: string;
  saveAsDraft?: boolean;
}

/** Quick Input submission endpoint (SRS §6.2). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "quick_input")) {
    return NextResponse.json(
      { error: "Your role cannot submit lexical entries." },
      { status: 403 }
    );
  }
  const p = (await req.json().catch(() => ({}))) as QuickInputPayload;
  const errors: Record<string, string> = {};
  const isModerator = session.role === "SYSTEM_MODERATOR";

  /* ---- anti-bot checks (skipped for System Moderator, SRS §7.2.2) -- */
  if (!isModerator) {
    if (store.config.honeypotEnabled && p.honeypot) {
      // Silent rejection per SRS §4.3 — pretend success
      return NextResponse.json({ ok: true, id: null });
    }
    if (
      (p.elapsedSeconds ?? 0) < store.config.minSubmissionSeconds &&
      !p.saveAsDraft
    ) {
      errors.timing = `Submission completed too quickly (minimum ${store.config.minSubmissionSeconds}s). It would be placed UNDER_REVIEW.`;
    }
    if (store.config.captchaEnabled && !p.captchaPassed && !p.saveAsDraft) {
      errors.captcha = "Please complete the CAPTCHA verification.";
    }
    /* rate limit (SRS §4.2) */
    const last24h = store.submissions.filter(
      (s) =>
        s.contributorId === session.userId &&
        Date.now() - new Date(s.createdAt).getTime() < 24 * 3600 * 1000
    ).length;
    if (last24h >= store.config.maxEntriesPerDay) {
      return NextResponse.json(
        {
          error: `Daily entry limit reached (${store.config.maxEntriesPerDay}/24h). Repeated violations trigger automatic suspension.`,
        },
        { status: 429 }
      );
    }
  }

  /* ---- field validation (SRS §6.2) -------------------------------- */
  const word = (p.writtenForm ?? "").trim();
  if (!word) errors.writtenForm = "Bengali word is required.";
  else if (!BENGALI_RE.test(word))
    errors.writtenForm =
      "Must contain at least one Bengali Unicode character (U+0980–U+09FF).";
  else if (word.length > 25)
    errors.writtenForm = "Maximum 25 characters allowed.";

  if (!p.pos || !["n", "v", "a", "r"].includes(p.pos))
    errors.pos = "Part of speech is required.";

  if (p.synsetAction === "link") {
    const syn = p.synsetId ? synsetById.get(p.synsetId) : undefined;
    if (!syn) errors.synsetId = "Synset ID must match an existing synset.";
    else if (syn.pos !== p.pos)
      errors.synsetId = `POS mismatch: selected synset is "${syn.pos}" but the lemma is "${p.pos}".`;
  } else if (p.synsetAction === "create") {
    const ili = (p.iliCode ?? "").trim();
    if (!/^\d{8}-[nvar]$/.test(ili))
      errors.iliCode =
        "ILI code must follow the format {8-digit-offset}-{n|v|a|r}, e.g. 04192858-n.";
    else if (!ili.endsWith(p.pos ?? ""))
      errors.iliCode = "ILI code POS suffix must match the selected part of speech.";
    else if (!isValidWn21Ili(ili))
      errors.iliCode =
        "This ILI code is not in the Princeton WordNet 2.1 registry. Use the ILI Finder to look up the correct code.";
    else if (isKnownIli(ili))
      errors.iliCode =
        "This ILI code already has a Bengali synset — use “Link to existing synset” instead.";
  } else {
    errors.synsetAction = "Choose to link an existing synset or create a new one.";
  }

  if (p.definitionText) {
    if (p.definitionText.length > 500)
      errors.definitionText = "Definition must be at most 500 characters.";
    if (p.definitionLanguage === "ben" && !BENGALI_RE.test(p.definitionText))
      errors.definitionText =
        "Bengali definitions must contain Bengali script characters.";
  }
  if (p.reviewerNote && p.reviewerNote.length > 500)
    errors.reviewerNote = "Note must be at most 500 characters.";

  if (
    isModerator &&
    p.directApprove &&
    (p.directApproveJustification ?? "").trim().length < 20
  ) {
    errors.directApproveJustification =
      "Direct approval requires a written justification of at least 20 characters.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  /* ---- duplicate detection (SRS §6.4) ------------------------------ */
  const targetIli =
    p.synsetAction === "link"
      ? synsetById.get(p.synsetId!)?.ili
      : p.iliCode;
  const exact = store.submissions.find(
    (s) =>
      s.writtenForm === word &&
      s.pos === p.pos &&
      (s.synsetAction === "link"
        ? synsetById.get(s.synsetId ?? "")?.ili
        : s.iliCode) === targetIli &&
      s.state !== "REJECTED"
  );
  if (exact) {
    return NextResponse.json(
      {
        errors: {
          duplicate: `Exact duplicate blocked: "${word}" (${p.pos}) is already linked to ILI ${targetIli} (submission ${exact.id}).`,
        },
      },
      { status: 409 }
    );
  }
  const near = store.submissions.find(
    (s) => s.writtenForm === word && s.pos === p.pos && s.state !== "REJECTED"
  );
  if (near && !p.confirmNearDuplicate) {
    return NextResponse.json(
      {
        nearDuplicate: `"${word}" (${p.pos}) already exists with a different concept (submission ${near.id}). Confirm to proceed — this may be legitimate polysemy.`,
      },
      { status: 409 }
    );
  }

  /* ---- create ------------------------------------------------------ */
  const nowIso = new Date().toISOString();
  const sub: Submission = {
    id: `sub-${store.counters.submission++}`,
    state: "DRAFT",
    contributorId: session.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
    writtenForm: word,
    pos: p.pos as Submission["pos"],
    synsetAction: p.synsetAction!,
    synsetId: p.synsetAction === "link" ? p.synsetId : undefined,
    iliCode: p.synsetAction === "create" ? p.iliCode?.trim() : undefined,
    definitionLanguage: p.definitionText ? (p.definitionLanguage ?? "ben") : undefined,
    definitionText: p.definitionText?.trim() || undefined,
    senseRelations: p.senseRelations ?? [],
    synsetRelations: p.synsetRelations ?? [],
    reviewerNote: p.reviewerNote?.trim() || undefined,
    history: [
      {
        from: null,
        to: "DRAFT",
        actorId: session.userId,
        actorRole: session.role,
        timestamp: nowIso,
      },
    ],
  };
  store.submissions.push(sub);
  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: "SUBMISSION_CREATED",
    targetType: "SUBMISSION",
    targetId: sub.id,
    detail: `"${word}" (${p.pos})`,
  });

  if (!p.saveAsDraft) {
    transitionSubmission(sub, "PENDING_REVIEW", session.userId, session.role);
    if (isModerator && p.directApprove) {
      transitionSubmission(
        sub,
        "VALIDATED",
        session.userId,
        session.role,
        `Direct approval: ${p.directApproveJustification!.trim()}`
      );
      sub.validatedBy = session.userId;
      sub.validatedAt = new Date().toISOString();
    }
  }

  return NextResponse.json({ ok: true, id: sub.id, state: sub.state });
}
