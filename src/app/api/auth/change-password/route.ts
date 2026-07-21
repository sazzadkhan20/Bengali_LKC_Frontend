import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { credentialForUser, recordAudit, store } from "@/lib/store";

/**
 * Password change — step 2 of the two-step validation (SRS §3.2).
 * Requires the current password AND the OTP delivered to the registered
 * email (issued by /api/auth/password-otp). Used for the mandatory
 * first-login change (one-time password) and for routine password changes.
 * The one-time password is invalidated the instant the new password is
 * confirmed.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const p = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    otp?: string;
    newPassword?: string;
  };
  const credential = credentialForUser(session.userId);
  if (!credential) {
    return NextResponse.json({ error: "No credential on record." }, { status: 404 });
  }
  if (!p.currentPassword || credential.password !== p.currentPassword) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 401 }
    );
  }
  if (!credential.pendingOtp) {
    return NextResponse.json(
      { error: "No OTP requested. Complete step 1 first (OTP via registered email)." },
      { status: 422 }
    );
  }
  if (new Date(credential.pendingOtp.expiresAt).getTime() < Date.now()) {
    credential.pendingOtp = undefined;
    return NextResponse.json(
      { error: "The OTP has expired. Request a new one." },
      { status: 422 }
    );
  }
  if (!p.otp || credential.pendingOtp.code !== p.otp.trim()) {
    return NextResponse.json(
      { error: "Incorrect OTP. Check the code sent to your registered email." },
      { status: 401 }
    );
  }
  const next = (p.newPassword ?? "").trim();
  const min = store.config.passwordMinLength;
  if (next.length < min) {
    return NextResponse.json(
      { error: `New password must be at least ${min} characters (password policy, SRS §3.2).` },
      { status: 422 }
    );
  }
  if (next === credential.password) {
    return NextResponse.json(
      { error: "New password must be different from the current password." },
      { status: 422 }
    );
  }

  const wasFirstLogin = credential.oneTime;
  credential.password = next;
  credential.oneTime = false;
  credential.pendingOtp = undefined;
  credential.lastChangedAt = new Date().toISOString();

  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: wasFirstLogin ? "FIRST_LOGIN_PASSWORD_CHANGED" : "PASSWORD_CHANGED",
    targetType: "CREDENTIAL",
    targetId: credential.id,
    detail: wasFirstLogin
      ? "One-time password invalidated after email OTP verification — account fully activated"
      : "Password updated by the account holder (email OTP verified)",
  });
  return NextResponse.json({ ok: true });
}
