import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { recordAudit, store } from "@/lib/store";

/**
 * Credential issuance / force reset — Platform Architect only (SRS §3.2).
 * Generates a one-time password for the selected user. In production the
 * credential is delivered exclusively by email; the demo returns it so it
 * can be displayed once.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "manage_credentials")) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const p = (await req.json().catch(() => ({}))) as { userId?: string };
  const user = store.users.find((u) => u.id === p.userId);
  if (!user) {
    return NextResponse.json({ error: "Select a valid user." }, { status: 422 });
  }

  const oneTimePassword = `lkc-${randomUUID().slice(0, 10)}`;
  let credential = store.credentials.find((c) => c.userId === user.id);
  const isReset = Boolean(credential);
  if (credential) {
    credential.password = oneTimePassword;
    credential.oneTime = true;
    credential.deactivated = false;
    credential.issuedBy = session.userId;
    credential.issuedAt = new Date().toISOString();
  } else {
    credential = {
      id: `cred-${store.counters.credential++}`,
      userId: user.id,
      username: user.username,
      password: oneTimePassword,
      oneTime: true,
      issuedBy: session.userId,
      issuedAt: new Date().toISOString(),
      deactivated: false,
    };
    store.credentials.push(credential);
  }

  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: isReset ? "PASSWORD_FORCE_RESET" : "CREDENTIAL_ISSUED",
    targetType: "CREDENTIAL",
    targetId: credential.id,
    detail: `${user.name} (${user.role}) — one-time password emailed to ${user.email}; change required at first login`,
  });

  return NextResponse.json({
    ok: true,
    credential: {
      id: credential.id,
      username: credential.username,
      email: user.email,
      // Demo only — production delivers this exclusively by email.
      demoOneTimePassword: oneTimePassword,
    },
  });
}
