import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

/** Step 1 — request forgot-password OTP by username or email. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    identifier?: string;
    username?: string;
    email?: string;
  };
  const identifier =
    (typeof body.identifier === "string" && body.identifier.trim()) ||
    (typeof body.username === "string" && body.username.trim()) ||
    (typeof body.email === "string" && body.email.trim()) ||
    "";

  if (!identifier) {
    return NextResponse.json(
      { errors: { identifier: "Enter your username or email address." } },
      { status: 400 }
    );
  }

  try {
    const result = await backendFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error("[auth/forgot-password]", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 }
    );
  }
}
