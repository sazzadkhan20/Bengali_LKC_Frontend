import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { proxyRefresh } from "@/lib/auth-proxy";
import { REFRESH_COOKIE } from "@/lib/auth-cookies";

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  try {
    return await proxyRefresh(refresh);
  } catch (err) {
    console.error("[auth/refresh] backend unreachable", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 }
    );
  }
}
