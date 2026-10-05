import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { clearAuthCookies, setAuthCookies, tokensFromBody } from "@/lib/auth-cookies";
import { refreshTokens } from "@/lib/token-refresh";

/** Apply rotated tokens from a backend auth response onto the Next.js response. */
export function applyTokenResponse(res: NextResponse, data: Record<string, unknown>) {
  const tokens = tokensFromBody(data);
  if (tokens) setAuthCookies(res, tokens);
  return res;
}

export async function proxyLogin(username: string, password: string) {
  const result = await backendFetch<Record<string, unknown>>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const res = NextResponse.json(result.data, { status: result.status });
  if (result.ok) applyTokenResponse(res, result.data);
  return res;
}

export async function proxyRefresh(refreshToken: string | undefined) {
  if (!refreshToken) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }
  const tokens = await refreshTokens(refreshToken);
  if (!tokens) {
    const res = NextResponse.json({ error: "Invalid or revoked refresh token." }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true, expiresIn: tokens.expiresIn });
  setAuthCookies(res, tokens);
  return res;
}
