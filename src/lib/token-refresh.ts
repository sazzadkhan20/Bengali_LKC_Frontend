import "server-only";
import { backendFetch } from "@/lib/backend";
import { tokensFromBody, type AuthTokens } from "@/lib/auth-cookies";

export type RotatedTokens = AuthTokens;

/**
 * The backend rotates refresh tokens and revokes the old one on use, so parallel
 * requests carrying the same (old) refresh cookie must share one refresh call.
 * Results are kept briefly because the browser may still send the old cookie on
 * requests that were already in flight when the new cookies were issued.
 */
const GRACE_MS = 2 * 60_000;

type RefreshStore = {
  inflight: Map<string, Promise<RotatedTokens | null>>;
  recent: Map<string, { tokens: RotatedTokens; at: number }>;
};
// Server Components and Route Handlers are bundled separately; share one store per process.
const globalStore = globalThis as typeof globalThis & { __lkcTokenRefresh?: RefreshStore };
const store = (globalStore.__lkcTokenRefresh ??= { inflight: new Map(), recent: new Map() });
const { inflight, recent } = store;

/** `forwardedFor` must be passed when called outside a request scope where `headers()` works (e.g. proxy). */
export function refreshTokens(
  refreshToken: string,
  forwardedFor?: string
): Promise<RotatedTokens | null> {
  const now = Date.now();
  for (const [key, entry] of recent) {
    if (now - entry.at > GRACE_MS) recent.delete(key);
  }
  const cached = recent.get(refreshToken);
  if (cached) return Promise.resolve(cached.tokens);

  const pending = inflight.get(refreshToken);
  if (pending) return pending;

  const promise = backendFetch<Record<string, unknown>>("/api/auth/refresh", {
    method: "POST",
    refreshToken,
    headers: forwardedFor ? { "X-Forwarded-For": forwardedFor } : undefined,
  })
    .then((res) => {
      const tokens = res.ok ? tokensFromBody(res.data) : null;
      if (!tokens) return null;
      recent.set(refreshToken, { tokens, at: Date.now() });
      return tokens;
    })
    .finally(() => inflight.delete(refreshToken));
  inflight.set(refreshToken, promise);
  return promise;
}

/** True when the JWT is present and not within `skewSeconds` of its `exp`. */
export function isAccessTokenFresh(token: string | null | undefined, skewSeconds = 30): boolean {
  if (!token) return false;
  const part = token.split(".")[1];
  if (!part) return true;
  try {
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
      exp?: number;
    };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 - Date.now() > skewSeconds * 1000;
  } catch {
    return true;
  }
}
