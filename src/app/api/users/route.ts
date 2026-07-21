import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { recordAudit, store } from "@/lib/store";
import type { Role, User } from "@/lib/types";

const ROLES: Role[] = [
  "PLATFORM_ARCHITECT",
  "SYSTEM_MODERATOR",
  "CONTRIBUTOR",
  "LEXICAL_EDITOR",
  "CHIEF_LEXICAL_EDITOR",
  "ARBITRATION_CURATOR",
];

/**
 * User account creation — Platform Architect only (SRS §3.2).
 * No user may self-register: the Architect creates the account and the
 * system generates the initial one-time login credential, delivered to
 * the user's registered email address.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "manage_users")) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const p = (await req.json().catch(() => ({}))) as {
    name?: string;
    username?: string;
    email?: string;
    role?: Role;
    dob?: string;
    institution?: string;
    occupation?: string;
  };
  const name = (p.name ?? "").trim();
  const username = (p.username ?? "").trim().toLowerCase();
  const email = (p.email ?? "").trim().toLowerCase();
  const dob = (p.dob ?? "").trim();
  const institution = (p.institution ?? "").trim();
  const occupation = (p.occupation ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Full name is required." }, { status: 422 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) {
    return NextResponse.json(
      { error: "A valid date of birth is required (author information)." },
      { status: 422 }
    );
  }
  if (Date.parse(dob) >= Date.now()) {
    return NextResponse.json(
      { error: "Date of birth must be in the past." },
      { status: 422 }
    );
  }
  if (!institution) {
    return NextResponse.json({ error: "Institution is required (author information)." }, { status: 422 });
  }
  if (!occupation) {
    return NextResponse.json({ error: "Occupation is required (author information)." }, { status: 422 });
  }
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–30 characters (letters, digits, . _ -)." },
      { status: 422 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid registered email address is required." },
      { status: 422 }
    );
  }
  if (!p.role || !ROLES.includes(p.role)) {
    return NextResponse.json({ error: "Select a valid role." }, { status: 422 });
  }
  if (store.users.some((u) => u.username.toLowerCase() === username)) {
    return NextResponse.json(
      { error: "This username is already taken." },
      { status: 409 }
    );
  }
  if (store.users.some((u) => u.email.toLowerCase() === email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const user: User = {
    id: `u-${store.counters.user++}`,
    username,
    name,
    role: p.role,
    email,
    active: true,
    suspended: false,
    joinedAt: new Date().toISOString().slice(0, 10),
    autoAnnounce: true,
    dob,
    institution,
    occupation,
  };
  store.users.push(user);

  const oneTimePassword = `lkc-${randomUUID().slice(0, 10)}`;
  const credential = {
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

  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: "USER_CREATED",
    targetType: "USER",
    targetId: user.id,
    detail: `${user.name} (${user.role})`,
  });
  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: "CREDENTIAL_ISSUED",
    targetType: "CREDENTIAL",
    targetId: credential.id,
    detail: `One-time password emailed to ${user.email}; change required at first login`,
  });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
    credential: {
      username: credential.username,
      email: user.email,
      // Demo only — production delivers this exclusively by email.
      demoOneTimePassword: oneTimePassword,
    },
  });
}
