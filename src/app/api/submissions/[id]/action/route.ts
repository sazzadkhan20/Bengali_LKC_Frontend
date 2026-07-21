import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { recordAudit, store, transitionSubmission } from "@/lib/store";
import type { EntryState } from "@/lib/types";

interface ActionPayload {
  action:
    | "approve"
    | "flag"
    | "reject"
    | "cflag"
    | "validate"
    | "escalate"
    | "resubmit"
    | "submit_draft"
    | "delete_draft"
    | "dispute"
    | "clear_under_review"
    | "override"
    | "assign";
  comment?: string;
  targetState?: EntryState;
  assignTo?: string;
  /* edited fields for resubmission */
  writtenForm?: string;
  definitionText?: string;
}

/**
 * Review pipeline actions implementing the state transition rules of
 * SRS §5.2 with role authorisation from the §3.3 permission matrix.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const sub = store.submissions.find((s) => s.id === id);
  if (!sub) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  const p = (await req.json().catch(() => ({}))) as ActionPayload;
  const comment = p.comment?.trim() ?? "";
  const role = session.role;
  const isOwner = sub.contributorId === session.userId;

  const fail = (error: string, status = 422) =>
    NextResponse.json({ error }, { status });

  switch (p.action) {
    /* ---- Lexical Editor primary validation (SRS §7.4.3) ---------- */
    case "approve": {
      if (!hasPermission(role, "primary_validate")) return fail("Not authorised.", 403);
      if (sub.state !== "PENDING_REVIEW")
        return fail("Only PENDING_REVIEW entries can be approved.");
      transitionSubmission(sub, "EDITOR_APPROVED", session.userId, role, comment || "Structure and data quality verified.");
      return NextResponse.json({ ok: true, state: sub.state });
    }
    case "flag": {
      if (!hasPermission(role, "primary_validate")) return fail("Not authorised.", 403);
      if (sub.state !== "PENDING_REVIEW")
        return fail("Only PENDING_REVIEW entries can be flagged.");
      if (comment.length < 15)
        return fail("Flag comment must be at least 15 characters (SRS §7.4.3).");
      sub.editorComment = comment;
      transitionSubmission(sub, "FLAGGED", session.userId, role, comment);
      return NextResponse.json({ ok: true, state: sub.state });
    }
    case "reject": {
      if (!hasPermission(role, "primary_validate")) return fail("Not authorised.", 403);
      if (sub.state !== "PENDING_REVIEW")
        return fail("Only PENDING_REVIEW entries can be rejected.");
      if (!comment) return fail("A rejection reason is mandatory.");
      sub.rejectionReason = comment;
      transitionSubmission(sub, "REJECTED", session.userId, role, comment);
      return NextResponse.json({ ok: true, state: sub.state });
    }

    /* ---- Chief Lexical Editor final validation (SRS §7.5.4) ------ */
    case "cflag": {
      if (!hasPermission(role, "final_validate")) return fail("Not authorised.", 403);
      if (sub.state !== "EDITOR_APPROVED")
        return fail("Only EDITOR_APPROVED entries can be C-flagged.");
      if (comment.length < 15)
        return fail("Linguistic note must be at least 15 characters (SRS §7.5.4).");
      sub.cleComment = comment;
      transitionSubmission(sub, "C_FLAGGED", session.userId, role, comment);
      // Both LE and Contributor are notified simultaneously (simulated via audit)
      recordAudit({
        actorId: "system",
        actorRole: "SYSTEM",
        action: "NOTIFY",
        targetType: "SUBMISSION",
        targetId: sub.id,
        detail: "C_FLAG notification sent to Lexical Editor and Contributor simultaneously",
      });
      return NextResponse.json({ ok: true, state: sub.state });
    }
    case "validate": {
      if (!hasPermission(role, "final_validate")) return fail("Not authorised.", 403);
      if (sub.state !== "EDITOR_APPROVED")
        return fail("Only EDITOR_APPROVED entries can be validated.");
      transitionSubmission(sub, "VALIDATED", session.userId, role, comment || "Linguistically correct. Approved for export.");
      sub.validatedBy = session.userId;
      sub.validatedAt = new Date().toISOString();
      return NextResponse.json({ ok: true, state: sub.state });
    }

    /* ---- Escalation to arbitration (SRS §7.4.3 / §7.5.4) --------- */
    case "escalate": {
      if (!hasPermission(role, "escalate")) return fail("Not authorised.", 403);
      if (!["PENDING_REVIEW", "EDITOR_APPROVED", "C_FLAGGED"].includes(sub.state))
        return fail("This entry's state cannot be escalated.");
      if (comment.length < 30)
        return fail("Escalation notes must be at least 30 characters.");
      const caseId = `case-${store.counters.case++}`;
      store.cases.push({
        id: caseId,
        submissionId: sub.id,
        claimantId: session.userId,
        accusedId: sub.contributorId,
        disputeType: "ESCALATION",
        disputeNote: comment,
        openedAt: new Date().toISOString(),
        responseDeadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        status: "RESPONSE_WINDOW",
        votes: [],
        excludedCuratorIds: store.users
          .filter(
            (u) =>
              u.role === "ARBITRATION_CURATOR" &&
              (u.id === session.userId || u.id === sub.contributorId)
          )
          .map((u) => u.id),
      });
      transitionSubmission(sub, "ARBITRATION", session.userId, role, comment);
      recordAudit({
        actorId: session.userId,
        actorRole: role,
        action: "CASE_OPENED",
        targetType: "ARBITRATION",
        targetId: caseId,
        detail: `Escalation for "${sub.writtenForm}" — 72-hour response window started`,
      });
      return NextResponse.json({ ok: true, state: sub.state, caseId });
    }

    /* ---- Contributor actions (SRS §7.3) --------------------------- */
    case "resubmit": {
      if (!isOwner && !hasPermission(role, "override_state"))
        return fail("Only the submitting contributor can resubmit.", 403);
      if (!["FLAGGED", "C_FLAGGED"].includes(sub.state))
        return fail("Only FLAGGED or C-FLAGGED entries can be resubmitted.");
      if (p.writtenForm?.trim()) sub.writtenForm = p.writtenForm.trim();
      if (p.definitionText !== undefined)
        sub.definitionText = p.definitionText.trim() || undefined;
      transitionSubmission(sub, "PENDING_REVIEW", session.userId, role, comment || "Corrected and resubmitted by contributor.");
      return NextResponse.json({ ok: true, state: sub.state });
    }
    case "submit_draft": {
      if (!isOwner) return fail("Only the owner can submit a draft.", 403);
      if (sub.state !== "DRAFT") return fail("Entry is not a draft.");
      transitionSubmission(sub, "PENDING_REVIEW", session.userId, role);
      return NextResponse.json({ ok: true, state: sub.state });
    }
    case "delete_draft": {
      if (!isOwner) return fail("Only the owner can delete a draft.", 403);
      if (sub.state !== "DRAFT") return fail("Only DRAFT entries can be deleted.");
      store.submissions.splice(
        store.submissions.findIndex((s) => s.id === sub.id),
        1
      );
      recordAudit({
        actorId: session.userId,
        actorRole: role,
        action: "DRAFT_DELETED",
        targetType: "SUBMISSION",
        targetId: sub.id,
        detail: `"${sub.writtenForm}"`,
      });
      return NextResponse.json({ ok: true });
    }
    case "dispute": {
      if (!isOwner || !hasPermission(role, "dispute"))
        return fail("Only the submitting contributor may dispute.", 403);
      if (!["REJECTED", "FLAGGED", "C_FLAGGED"].includes(sub.state))
        return fail("Disputes are only available on REJECTED, FLAGGED or C-FLAGGED entries.");
      if (comment.length < 30)
        return fail("A dispute note of at least 30 characters is mandatory (SRS §7.3.3).");
      // accused = the actor of the decision being disputed
      const lastDecision = [...sub.history]
        .reverse()
        .find((h) => ["REJECTED", "FLAGGED", "C_FLAGGED"].includes(h.to));
      const accusedId = lastDecision?.actorId ?? "u-le1";
      const caseId = `case-${store.counters.case++}`;
      store.cases.push({
        id: caseId,
        submissionId: sub.id,
        claimantId: session.userId,
        accusedId,
        disputeType: sub.state === "REJECTED" ? "DISPUTE_REJECTION" : "DISPUTE_FLAG",
        disputeNote: comment,
        openedAt: new Date().toISOString(),
        responseDeadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        status: "RESPONSE_WINDOW",
        votes: [],
        excludedCuratorIds: store.users
          .filter(
            (u) =>
              u.role === "ARBITRATION_CURATOR" &&
              (u.id === session.userId || u.id === accusedId)
          )
          .map((u) => u.id),
      });
      transitionSubmission(sub, "ARBITRATION", session.userId, role, comment);
      recordAudit({
        actorId: session.userId,
        actorRole: role,
        action: "CASE_OPENED",
        targetType: "ARBITRATION",
        targetId: caseId,
        detail: `Contributor dispute for "${sub.writtenForm}" — accused party has 72 hours to respond`,
      });
      return NextResponse.json({ ok: true, state: sub.state, caseId });
    }

    /* ---- Moderator / Architect operations ------------------------- */
    case "clear_under_review": {
      if (!hasPermission(role, "override_state")) return fail("Not authorised.", 403);
      if (sub.state !== "UNDER_REVIEW")
        return fail("Entry is not under anti-bot review.");
      transitionSubmission(sub, "PENDING_REVIEW", session.userId, role, comment || "Anti-bot hold cleared after manual review.");
      return NextResponse.json({ ok: true, state: sub.state });
    }
    case "override": {
      if (!hasPermission(role, "override_state")) return fail("Not authorised.", 403);
      if (!p.targetState) return fail("Target state is required.");
      if (!comment)
        return fail("Emergency overrides require a mandatory reason (SRS §5.2).");
      transitionSubmission(sub, p.targetState, session.userId, role, `EMERGENCY OVERRIDE: ${comment}`);
      if (p.targetState === "VALIDATED") {
        sub.validatedBy = session.userId;
        sub.validatedAt = new Date().toISOString();
      }
      if (p.targetState === "REJECTED") sub.rejectionReason = comment;
      return NextResponse.json({ ok: true, state: sub.state });
    }
    case "assign": {
      if (!hasPermission(role, "assign_entries")) return fail("Not authorised.", 403);
      sub.assignedTo = p.assignTo || undefined;
      recordAudit({
        actorId: session.userId,
        actorRole: role,
        action: "ENTRY_ASSIGNED",
        targetType: "SUBMISSION",
        targetId: sub.id,
        detail: `Assigned to ${p.assignTo ?? "(unassigned)"}`,
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return fail("Unknown action.");
  }
}
