import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse } from "next/server";
import { sessionCookieOptions, clearSessionCookieOptions } from "./session-cookie";

export const ACCESS_COOKIE = "lkc_session";
export const REFRESH_COOKIE = "lkc_refresh";

/** Access token cookie — mirrors backend session timeout (default 1 hour). */
export function setAuthCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }
) {
  const accessMaxAge = Math.max(60, Number(tokens.expiresIn) || 60 * 60);
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, sessionCookieOptions(accessMaxAge));
  if (tokens.refreshToken) {
    // Refresh cookie: 7 days (matches backend JWT_REFRESH_TTL_DAYS default)
    res.cookies.set(
      REFRESH_COOKIE,
      tokens.refreshToken,
      sessionCookieOptions(7 * 24 * 60 * 60)
    );
  }
}

export function clearAuthCookies(res: NextResponse) {
  const cleared = clearSessionCookieOptions();
  res.cookies.set(ACCESS_COOKIE, "", cleared);
  res.cookies.set(REFRESH_COOKIE, "", cleared);
}

export function refreshCookieOptions(): Partial<ResponseCookie> {
  return sessionCookieOptions(7 * 24 * 60 * 60);
}
