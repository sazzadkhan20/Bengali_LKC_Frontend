import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/lib/auth-cookies";

type AuthBody = Record<string, unknown> & {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
};

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
    let rotated: AuthBody | null = null;

    let result = access
      ? await backendFetch<AuthBody>("/api/auth/session", {
          method: "GET",
          accessToken: access,
        })
      : { ok: false, status: 401, data: { error: "Unauthorized" } as AuthBody };

    if ((!result.ok || result.status === 401) && refresh) {
      const refreshed = await backendFetch<AuthBody>("/api/auth/refresh", {
        method: "POST",
        refreshToken: refresh,
      });
      if (!refreshed.ok || typeof refreshed.data.accessToken !== "string") {
        const res = NextResponse.json(
          { error: refreshed.data.error ?? "Unauthorized" },
          { status: 401 }
        );
        clearAuthCookies(res);
        return res;
      }
      rotated = refreshed.data;
      access = refreshed.data.accessToken;
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
    if (rotated?.accessToken) {
      setAuthCookies(res, {
        accessToken: rotated.accessToken,
        refreshToken:
          typeof rotated.refreshToken === "string" ? rotated.refreshToken : undefined,
        expiresIn: typeof rotated.expiresIn === "number" ? rotated.expiresIn : 3600,
      });
    }
    return res;
  } catch (err) {
    console.error("[auth/session] backend unreachable", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 }
    );
  }
}
