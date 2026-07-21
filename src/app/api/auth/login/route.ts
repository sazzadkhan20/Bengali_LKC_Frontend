import { NextResponse } from "next/server";
import { SESSION_COOKIE, encodeSession } from "@/lib/auth";
import { recordAudit, store } from "@/lib/store";
import { sessionCookieOptions } from "@/lib/session-cookie";

/**
 * Credential-based authentication (SRS §3.2).
 * Users sign in with the username and password issued by the Platform
 * Architect. If the system-generated one-time password is still in force,
 * the user is forced to the Change Password screen before anything else.
 * In production the password is verified against a salted hash
 * (bcrypt/Argon2id) and the session is a JWT signed with RS256.
 */
export async function POST(req: Request) {
  const { username, password } = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  if (!username || typeof username !== "string" || !password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const credential = store.credentials.find(
    (c) => c.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (!credential || credential.password !== password) {
    return NextResponse.json(
      { error: "Invalid username or password. Credentials are issued by the Platform Architect." },
      { status: 401 }
    );
  }
  if (credential.deactivated) {
    return NextResponse.json(
      { error: "This credential has been deactivated by the Platform Architect." },
      { status: 401 }
    );
  }
  const user = store.users.find((u) => u.id === credential.userId);
  if (!user || !user.active) {
    return NextResponse.json(
      { error: "The account linked to this credential is inactive." },
      { status: 401 }
    );
  }
  if (user.suspended) {
    return NextResponse.json(
      { error: "This account is suspended pending Platform Architect review." },
      { status: 403 }
    );
  }

  recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: credential.oneTime ? "LOGIN_ONE_TIME_PASSWORD" : "LOGIN",
    targetType: "AUTH",
    detail: credential.oneTime
      ? `Credential ${credential.id} used — first-login password change required`
      : `Credential ${credential.id} used`,
  });

  const res = NextResponse.json({
    ok: true,
    user: { name: user.name, role: user.role },
    // Mandatory first-login password change (SRS §3.2)
    mustChangePassword: credential.oneTime,
  });
  res.cookies.set(
    SESSION_COOKIE,
    encodeSession({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      mustChangePassword: credential.oneTime || undefined,
    }),
    sessionCookieOptions(60 * 60)
  );
  return res;
}
