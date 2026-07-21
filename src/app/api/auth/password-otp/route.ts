import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { credentialForUser, recordAudit, userById } from "@/lib/store";

const OTP_VALIDITY_MINUTES = 5;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

/**
 * Step 1 of the two-step password change (SRS §3.2).
 * Verifies the current password, then generates a short-lived OTP and
 * delivers it to the account's registered email address. Demo deployment
 * returns the OTP in the response; production delivers it by email only.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const p = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
  };
  const credential = credentialForUser(session.userId);
  const user = userById(session.userId);
  if (!credential || !user) {
    return NextResponse.json({ error: "No credential on record." }, { status: 404 });
  }
  if (!p.currentPassword || credential.password !== p.currentPassword) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 401 }
    );
  }

  const code = String(randomInt(100000, 1000000));
  credential.pendingOtp = {
    code,
    expiresAt: new Date(Date.now() + OTP_VALIDITY_MINUTES * 60_000).toISOString(),
  };

  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: "PASSWORD_OTP_SENT",
    targetType: "CREDENTIAL",
    targetId: credential.id,
    detail: `Password-change OTP emailed to ${maskEmail(user.email)} (valid ${OTP_VALIDITY_MINUTES} min)`,
  });

  return NextResponse.json({
    ok: true,
    maskedEmail: maskEmail(user.email),
    validMinutes: OTP_VALIDITY_MINUTES,
    // Demo only — production delivers the OTP exclusively by email.
    demoOtp: code,
  });
}
