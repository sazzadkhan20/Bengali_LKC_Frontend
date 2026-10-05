import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth-cookies";
import { applyTokenResponse } from "@/lib/auth-proxy";

export async function POST(req: Request) {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const result = await backendFetch<Record<string, unknown>>("/api/auth/change-password", {
      method: "POST",
      accessToken: access,
      refreshToken: jar.get(REFRESH_COOKIE)?.value,
      body: JSON.stringify(body),
    });
    const res = NextResponse.json(result.data, { status: result.status });
    return result.ok ? applyTokenResponse(res, result.data) : res;
  } catch (err) {
    console.error("[auth/change-password]", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 }
    );
  }
}
