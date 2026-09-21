import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth-cookies";

/** Authenticated BFF call to the Spring API using the access JWT cookie. */
export async function backendAuthedFetch<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {}
) {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return {
      ok: false as const,
      status: 401,
      data: { error: "Unauthorized" } as T,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const result = await backendFetch<T>(path, {
    ...init,
    accessToken: access,
    refreshToken: jar.get(REFRESH_COOKIE)?.value,
  });
  return {
    ...result,
    response: NextResponse.json(result.data, { status: result.status }),
  };
}
