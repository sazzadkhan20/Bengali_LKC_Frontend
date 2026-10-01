import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { STATE_LABEL } from "@/lib/format";
import type { EntryState } from "@/lib/types";

/** Actions this release never sends for an entry whose status is final (Validated / Rejected). */
const BLOCKED_ON_FINAL = new Set(["override", "assign", "clear_under_review"]);

type Detail = {
  state?: EntryState;
  lifecycle?: { final?: boolean; forwardOverrideTargets?: EntryState[] };
};

/**
 * Review pipeline actions (SRS §5.2) — state rules and permissions are enforced by Spring.
 * Spring's override accepts any target (backward included) for future use; this release only
 * forwards final-state-safe, forward-only overrides.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const path = `/api/submissions/${encodeURIComponent(id)}`;
    const action = String(body?.action ?? "");

    if (BLOCKED_ON_FINAL.has(action)) {
      const current = await backendAuthedFetch<Detail>(path);
      if (!current.ok) return current.response;
      const state = current.data.state;
      const label = state ? (STATE_LABEL[state] ?? state) : "final";
      if (current.data.lifecycle?.final ?? (state === "VALIDATED" || state === "REJECTED")) {
        return NextResponse.json(
          { error: `This entry is ${label}. Its status is final and cannot be changed or overridden.` },
          { status: 409 }
        );
      }
      const allowed = current.data.lifecycle?.forwardOverrideTargets;
      if (action === "override" && allowed) {
        if (!allowed.includes(body.targetState)) {
          return NextResponse.json(
            {
              errors: {
                targetState: allowed.length
                  ? `From ${label} the entry can only be moved forward to ${allowed
                      .map((s) => STATE_LABEL[s] ?? s)
                      .join(", ")}.`
                  : `No emergency override is available while the entry is ${label}.`,
              },
            },
            { status: 422 }
          );
        }
      }
    }

    const result = await backendAuthedFetch(`${path}/action`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.response;
  } catch (err) {
    console.error("[submissions action POST]", err);
    return NextResponse.json({ error: "Submission service unavailable." }, { status: 503 });
  }
}
