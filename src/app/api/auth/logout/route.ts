import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies } from "@/lib/auth-cookies";

export async function POST() {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  try {
    await backendFetch("/api/auth/logout", {
      method: "POST",
      accessToken: access,
      refreshToken: refresh,
    });
  } catch {
    // Still clear local cookies even if backend is down.
  }
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
