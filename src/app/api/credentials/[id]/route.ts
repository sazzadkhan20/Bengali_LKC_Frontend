import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { recordAudit, store, userById } from "@/lib/store";

/**
 * Credential deactivation / reactivation — Platform Architect only
 * (SRS §3.2). Deactivation immediately invalidates all active sessions
 * for the account.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "manage_credentials")) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const { id } = await params;
  const credential = store.credentials.find((c) => c.id === id);
  if (!credential) {
    return NextResponse.json({ error: "Credential not found." }, { status: 404 });
  }
  const p = (await req.json().catch(() => ({}))) as {
    deactivated?: boolean;
  };
  if (typeof p.deactivated !== "boolean") {
    return NextResponse.json({ error: "Nothing to update." }, { status: 422 });
  }
  credential.deactivated = p.deactivated;
  const holder = userById(credential.userId);
  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: p.deactivated ? "CREDENTIAL_DEACTIVATED" : "CREDENTIAL_REACTIVATED",
    targetType: "CREDENTIAL",
    targetId: credential.id,
    detail: p.deactivated
      ? `${holder?.name ?? credential.username} — all active sessions immediately invalidated`
      : `${holder?.name ?? credential.username} — credential restored`,
  });
  return NextResponse.json({ ok: true });
}
