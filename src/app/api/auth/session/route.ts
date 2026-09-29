import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/lib/auth-cookies";
import { refreshTokens, type RotatedTokens } from "@/lib/token-refresh";

type AuthBody = Record<string, unknown> & { error?: string };

/**
 * Session API — returns all user data needed by the frontend after login.
 * Automatically refreshes the access token when it has expired (1-hour session).
 */
export async function GET() {
  const jar = await cookies();
  let access = jar.get(ACCESS_COOKIE)?.value ?? null;
  const refresh = jar.get(REFRESH_COOKIE)?.value ?? null;

  if (!access && !refresh) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let rotated: RotatedTokens | null = null;

    let result = access
      ? await backendFetch<AuthBody>("/api/auth/session", {
          method: "GET",
          accessToken: access,
        })
      : { ok: false, status: 401, data: { error: "Unauthorized" } as AuthBody };

    if (result.status === 401 && refresh) {
      rotated = await refreshTokens(refresh);
      if (!rotated) {
        const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        clearAuthCookies(res);
        return res;
      }
      access = rotated.accessToken;
      result = await backendFetch<AuthBody>("/api/auth/session", {
        method: "GET",
        accessToken: access,
      });
    }

    if (!result.ok) {
      const res = NextResponse.json(
        { error: result.data.error ?? "Unauthorized" },
        { status: result.status || 401 }
      );
      if (result.status === 401) clearAuthCookies(res);
      return res;
    }

    const res = NextResponse.json(result.data, { status: 200 });
    if (rotated) setAuthCookies(res, rotated);
    return res;
  } catch (err) {
    console.error("[auth/session] backend unreachable", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 }
    );
  }
}
