import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth-cookies";

export async function POST(req: Request) {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const result = await backendFetch("/api/auth/password-otp", {
      method: "POST",
      accessToken: access,
      refreshToken: jar.get(REFRESH_COOKIE)?.value,
      body: JSON.stringify(body),
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error("[auth/password-otp]", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 }
    );
  }
}
