import { NextResponse } from "next/server";
import { sessionCookieOptions, clearSessionCookieOptions } from "./session-cookie";

export const ACCESS_COOKIE = "lkc_session";
export const REFRESH_COOKIE = "lkc_refresh";

/** Fallback when the backend omits lifetimes; matches its defaults (1-hour access, 7-day session). */
const DEFAULT_ACCESS_SECONDS = 60 * 60;
const DEFAULT_SESSION_SECONDS = 7 * 24 * 60 * 60;

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  /** Seconds the access token stays valid. */
  expiresIn?: number;
  /** Seconds left in the sign-in session; the backend never extends this on refresh. */
  refreshExpiresIn?: number;
};

export function setAuthCookies(res: NextResponse, tokens: AuthTokens) {
  const accessMaxAge = Math.max(1, Math.floor(Number(tokens.expiresIn) || DEFAULT_ACCESS_SECONDS));
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, sessionCookieOptions(accessMaxAge));
  if (tokens.refreshToken) {
    const sessionMaxAge = Math.max(
      1,
      Math.floor(Number(tokens.refreshExpiresIn) || DEFAULT_SESSION_SECONDS)
    );
    res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, sessionCookieOptions(sessionMaxAge));
  }
}

/** Reads token fields from a backend auth response (login, refresh, password change). */
export function tokensFromBody(data: Record<string, unknown>): AuthTokens | null {
  if (typeof data.accessToken !== "string") return null;
  return {
    accessToken: data.accessToken,
    refreshToken: typeof data.refreshToken === "string" ? data.refreshToken : undefined,
    expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : undefined,
    refreshExpiresIn: typeof data.refreshExpiresIn === "number" ? data.refreshExpiresIn : undefined,
  };
}

export function clearAuthCookies(res: NextResponse) {
  const cleared = clearSessionCookieOptions();
  res.cookies.set(ACCESS_COOKIE, "", cleared);
  res.cookies.set(REFRESH_COOKIE, "", cleared);
}