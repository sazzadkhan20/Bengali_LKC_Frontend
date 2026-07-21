import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import {
  evaluateCase,
  recordAudit,
  store,
  transitionSubmission,
} from "@/lib/store";
import type { ArbitrationCase, EntryState } from "@/lib/types";

interface ArbPayload {
  action: "vote" | "tiebreak" | "respond" | "activate" | "apply_correction";
  verdict?: "APPROVE_CLAIMANT" | "APPROVE_ACCUSED" | "REJECT";
  rationale?: string;
  correctionNote?: string;
  counterClaim?: string;
}

/** Resolve the submission outcome once a case verdict is final (SRS §7.6.4). */
function applyVerdict(c: ArbitrationCase, actorId: string) {
  const sub = store.submissions.find((s) => s.id === c.submissionId);
  if (!sub || !c.finalVerdict) return;
  if (c.finalVerdict === "REJECT") {
    // Entry returns to its pre-arbitration state; dispute closed.
    const prior = [...sub.history]
      .reverse()
      .find((h) => h.to === "ARBITRATION")?.from;
    transitionSubmission(
      sub,
      (prior ?? "REJECTED") as EntryState,
      actorId,
      "SYSTEM",
      "Arbitration verdict: previous decision upheld. No further appeals possible."
    );
  } else {
    transitionSubmission(
      sub,
      "VALIDATED",
      actorId,
      "SYSTEM",
      `Arbitration verdict: ${c.finalVerdict === "APPROVE_CLAIMANT" ? "claimant's" : "accused party's"} version approved by panel.`
    );
    sub.validatedBy = actorId;
    sub.validatedAt = new Date().toISOString();
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const c = store.cases.find((x) => x.id === id);
  if (!c) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  const p = (await req.json().catch(() => ({}))) as ArbPayload;
  const fail = (error: string, status = 422) =>
    NextResponse.json({ error }, { status });

  switch (p.action) {
    /* ---- curator panel vote (SRS §7.6.1) -------------------------- */
    case "vote": {
      if (!hasPermission(session.role, "arbitration_vote"))
        return fail("Only Arbitration Curators may vote.", 403);
      if (c.status !== "ACTIVE")
        return fail(
          c.status === "RESPONSE_WINDOW"
            ? "The 72-hour response window has not closed yet."
            : "This case is no longer open for voting."
        );
      if (c.excludedCuratorIds.includes(session.userId))
        return fail("Conflict of interest: you are a party to this case.", 403);
      if (c.votes.some((v) => v.curatorId === session.userId))
        return fail("You have already voted on this case.");
      if (!p.verdict) return fail("A verdict is required.");
      if ((p.rationale ?? "").trim().length < 30)
        return fail("A rationale of at least 30 characters is mandatory.");

      c.votes.push({
        curatorId: session.userId,
        verdict: p.verdict,
        rationale: p.rationale!.trim(),
        correctionNote: p.correctionNote?.trim() || undefined,
        votedAt: new Date().toISOString(),
      });
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: "ARBITRATION_VOTE",
        targetType: "ARBITRATION",
        targetId: c.id,
        detail: `Vote recorded (verdicts hidden from parties)`,
      });
      evaluateCase(c);
      const statusAfterVote = c.status as ArbitrationCase["status"];
      if (statusAfterVote === "RESOLVED") applyVerdict(c, session.userId);
      if (statusAfterVote === "TIE_PENDING") {
        recordAudit({
          actorId: "system",
          actorRole: "SYSTEM",
          action: "TIE_DETECTED",
          targetType: "ARBITRATION",
          targetId: c.id,
          detail: "Quorum met with a draw — System Moderator tie-break required",
        });
      }
      return NextResponse.json({ ok: true, status: c.status });
    }

    /* ---- System Moderator tie-break (SRS §7.6.1) ------------------ */
    case "tiebreak": {
      if (!hasPermission(session.role, "tie_breaker"))
        return fail("Only the System Moderator may break ties.", 403);
      if (c.status !== "TIE_PENDING")
        return fail("This case is not awaiting a tie-break.");
      if (!p.verdict) return fail("A verdict is required.");
      if ((p.rationale ?? "").trim().length < 30)
        return fail("A tie-break rationale of at least 30 characters is mandatory.");
      c.finalVerdict = p.verdict;
      c.verdictBy = "TIE_BREAK";
      c.tieBrokenBy = session.userId;
      c.status = "RESOLVED";
      c.resolvedAt = new Date().toISOString();
      c.correctionNote = c.votes.find((v) => v.correctionNote)?.correctionNote;
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: "TIE_BREAK_VERDICT",
        targetType: "ARBITRATION",
        targetId: c.id,
        detail: `Final verdict: ${p.verdict} — ${p.rationale!.trim().slice(0, 60)}`,
      });
      applyVerdict(c, session.userId);
      return NextResponse.json({ ok: true, status: c.status });
    }

    /* ---- accused party counter-claim (SRS §7.3.3) ----------------- */
    case "respond": {
      if (session.userId !== c.accusedId)
        return fail("Only the accused party may submit a counter-claim.", 403);
      if (c.status !== "RESPONSE_WINDOW")
        return fail("The response window for this case has closed.");
      if ((p.counterClaim ?? "").trim().length < 15)
        return fail("Counter-claim must be at least 15 characters.");
      c.counterClaim = p.counterClaim!.trim();
      c.status = "ACTIVE";
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: "COUNTER_CLAIM",
        targetType: "ARBITRATION",
        targetId: c.id,
        detail: "Counter-claim submitted — case now active for voting",
      });
      return NextResponse.json({ ok: true, status: c.status });
    }

    /* ---- activate after window expiry (no response) ---------------- */
    case "activate": {
      if (!hasPermission(session.role, "override_state"))
        return fail("Not authorised.", 403);
      if (c.status !== "RESPONSE_WINDOW") return fail("Case is not in a response window.");
      c.status = "ACTIVE";
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: "CASE_ACTIVATED",
        targetType: "ARBITRATION",
        targetId: c.id,
        detail: "Response window closed without counter-claim — case active for voting",
      });
      return NextResponse.json({ ok: true, status: c.status });
    }

    /* ---- SM applies the panel's correction note (SRS §7.6.4) ------ */
    case "apply_correction": {
      if (!hasPermission(session.role, "apply_corrections"))
        return fail("Only the System Moderator may apply panel corrections.", 403);
      if (c.status !== "RESOLVED" || !c.correctionNote)
        return fail("No pending correction on this case.");
      if (c.correctionApplied) return fail("Correction already applied.");
      c.correctionApplied = true;
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: "CORRECTION_APPLIED",
        targetType: "ARBITRATION",
        targetId: c.id,
        detail: c.correctionNote.slice(0, 80),
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return fail("Unknown action.");
  }
}
