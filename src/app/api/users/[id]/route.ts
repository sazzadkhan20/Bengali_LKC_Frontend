import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { recordAudit, store } from "@/lib/store";

/**
 * User management operations — Platform Architect only (SRS §3.3).
 * Exception: any authenticated user may toggle their own milestone
 * auto-announcement preference (SRS §14.2).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const { id } = await params;
  const user = store.users.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  const p = (await req.json().catch(() => ({}))) as {
    suspended?: boolean;
    active?: boolean;
    autoAnnounce?: boolean;
  };
  if (typeof p.autoAnnounce === "boolean") {
    if (session.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only change your own announcement preference." },
        { status: 403 }
      );
    }
    user.autoAnnounce = p.autoAnnounce;
    return NextResponse.json({ ok: true });
  }
  if (!hasPermission(session.role, "manage_users")) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  if (typeof p.suspended === "boolean") {
    user.suspended = p.suspended;
    // A suspended account's credential is frozen pending review (SRS §4.4)
    const credential = store.credentials.find((c) => c.userId === user.id);
    if (credential) credential.deactivated = p.suspended;
    recordAudit({
      actorId: session.userId,
      actorRole: session.role,
      action: p.suspended ? "ACCOUNT_SUSPENDED" : "ACCOUNT_REINSTATED",
      targetType: "USER",
      targetId: user.id,
      detail: `${user.name} (${user.role}) — manual review by Platform Architect`,
    });
  }
  if (typeof p.active === "boolean") {
    user.active = p.active;
    recordAudit({
      actorId: session.userId,
      actorRole: session.role,
      action: p.active ? "ACCOUNT_ACTIVATED" : "ACCOUNT_DEACTIVATED",
      targetType: "USER",
      targetId: user.id,
      detail: user.name,
    });
  }
  return NextResponse.json({ ok: true });
}
