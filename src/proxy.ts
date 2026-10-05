import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies } from "@/lib/auth-cookies";
import { isAccessTokenFresh, refreshTokens } from "@/lib/token-refresh";

/**
 * Renews an expired access token before the page renders. Server Components cannot set
 * cookies, so without this a rotated refresh token would never reach the browser and the
 * next request would present a revoked one. The session still ends when the refresh token
 * does: the backend keeps its sign-in expiry fixed across rotations.
 */
export async function proxy(request: NextRequest) {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh || isAccessTokenFresh(request.cookies.get(ACCESS_COOKIE)?.value, 60)) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "127.0.0.1";
  const tokens = await refreshTokens(refresh, ip).catch(() => null);
  // On failure, let the request through untouched: pages and API routes already treat a
  // missing or rejected session as signed out.
  if (!tokens) return NextResponse.next();

  request.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  if (tokens.refreshToken) request.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
  const response = NextResponse.next({ request: { headers: request.headers } });
  setAuthCookies(response, tokens);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/auth/(?:login|logout|refresh)|favicon\\.ico|.*\\.(?:png|jpe?g|gif|svg|webp|ico|txt|xml|woff2?)$).*)",
  ],
};
