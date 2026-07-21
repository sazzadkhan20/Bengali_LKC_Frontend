import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { recordAudit, store } from "@/lib/store";

/**
 * Forgot-password flow (SRS §3.2): the user can reset their password
 * through email validation. A new one-time password is generated and sent
 * to the registered email address; it must be changed at the next login.
 * In this demo the one-time password is returned in the response instead
 * of being emailed.
 */
export async function POST(req: Request) {
  const { identifier } = (await req.json().catch(() => ({}))) as {
    identifier?: string;
  };
  if (!identifier || typeof identifier !== "string") {
    return NextResponse.json(
      { error: "Enter your username or registered email address." },
      { status: 400 }
    );
  }
  const needle = identifier.trim().toLowerCase();
  const user = store.users.find(
    (u) =>
      u.username.toLowerCase() === needle || u.email.toLowerCase() === needle
  );
  const credential = user
    ? store.credentials.find((c) => c.userId === user.id)
    : undefined;

  // Do not reveal whether the account exists (production behaviour);
  // the demo still reports success either way.
  if (!user || !credential || credential.deactivated || !user.active) {
    return NextResponse.json({
      ok: true,
      message:
        "If the account exists, a password-reset email has been sent to the registered address.",
    });
  }

  const oneTimePassword = `reset-${randomUUID().slice(0, 8)}`;
  credential.password = oneTimePassword;
  credential.oneTime = true;

  recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "PASSWORD_RESET_REQUESTED",
    targetType: "CREDENTIAL",
    targetId: credential.id,
    detail: "Forgot-password flow: one-time password emailed after email validation",
  });

  return NextResponse.json({
    ok: true,
    message: `A one-time password has been sent to ${user.email}. It must be changed at your next login.`,
    // Demo only — in production this is delivered exclusively by email.
    demoOneTimePassword: oneTimePassword,
  });
}
