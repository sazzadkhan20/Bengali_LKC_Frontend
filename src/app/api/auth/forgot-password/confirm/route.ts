import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

/** Step 2 — verify OTP and set a new password (unauthenticated). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    identifier?: string;
    username?: string;
    email?: string;
    otp?: string;
    newPassword?: string;
  };

  const identifier =
    (typeof body.identifier === "string" && body.identifier.trim()) ||
    (typeof body.username === "string" && body.username.trim()) ||
    (typeof body.email === "string" && body.email.trim()) ||
    "";
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  const errors: Record<string, string> = {};
  if (!identifier) {
    errors.identifier = "Enter your username or email address.";
  }
  if (!otp) {
    errors.otp = "Enter the 6-digit code from your email.";
  }
  if (!newPassword) {
    errors.newPassword = "Enter a new password.";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  try {
    const result = await backendFetch("/api/auth/forgot-password/confirm", {
      method: "POST",
      body: JSON.stringify({ identifier, otp, newPassword }),
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error("[auth/forgot-password/confirm]", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 }
    );
  }
}
