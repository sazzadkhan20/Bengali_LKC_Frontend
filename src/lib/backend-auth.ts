import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendFetch, type BackendResult } from "@/lib/backend";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/lib/auth-cookies";
import { isAccessTokenFresh, refreshTokens, type RotatedTokens } from "@/lib/token-refresh";

/**
 * Authenticated BFF call to the Spring API using the access JWT cookie.
 *
 * An expired (or about-to-expire) access token is refreshed before the call, and a
 * 401 triggers one refresh + retry, so the first request after the 1-hour access
 * window never fails. Rotated tokens are written onto `response`; Server Components
 * cannot set cookies, so they only use `data` and the SessionProvider persists them.
 */
export async function backendAuthedFetch<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {}
) {
  const jar = await cookies();
  let access = jar.get(ACCESS_COOKIE)?.value ?? null;
  const refresh = jar.get(REFRESH_COOKIE)?.value ?? null;
  let rotated: RotatedTokens | null = null;
  let refreshFailed = false;

  const tryRefresh = async () => {
    if (!refresh || rotated || refreshFailed) return false;
    rotated = await refreshTokens(refresh);
    if (!rotated) {
      refreshFailed = true;
      return false;
    }
    access = rotated.accessToken;
    return true;
  };

  if (!isAccessTokenFresh(access)) await tryRefresh();

  let result: BackendResult<T>;
  if (!access) {
    result = { ok: false, status: 401, data: { error: "Unauthorized" } as T };
  } else {
    const call = () =>
      backendFetch<T>(path, {
        ...init,
        accessToken: access,
        refreshToken: (rotated as RotatedTokens | null)?.refreshToken ?? refresh,
      });
    result = await call();
    if (result.status === 401 && (await tryRefresh())) {
      result = await call();
    }
  }

  const response = NextResponse.json(result.data, { status: result.status });
  const tokens = rotated as RotatedTokens | null;
  if (tokens) {
    setAuthCookies(response, tokens);
  } else if (refreshFailed) {
    clearAuthCookies(response);
  }
  return { ...result, response };
}
