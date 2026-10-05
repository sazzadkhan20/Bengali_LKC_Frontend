import "server-only";
import { headers as requestHeaders } from "next/headers";
import { unstable_rethrow } from "next/navigation";

/**
 * Server-side client for the Bengali LKC Spring Boot API.
 * Used by Next.js route handlers (BFF) so cookies stay on the frontend origin.
 */
export function backendBaseUrl(): string {
  return (
    process.env.BACKEND_API_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "") ||
    "http://localhost:8080"
  );
}

export type BackendResult<T = Record<string, unknown>> = {
  ok: boolean;
  status: number;
  data: T;
};

/**
 * The visitor's IP from the incoming request. Anonymous API calls are
 * rate-limited per IP, and every call reaches the API from this server, so the
 * original address has to be forwarded explicitly.
 */
async function visitorIp(): Promise<string | null> {
  try {
    const h = await requestHeaders();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip")?.trim() ||
      null
    );
  } catch (err) {
    unstable_rethrow(err);
    return null; // outside a request scope
  }
}

export async function backendFetch<T = Record<string, unknown>>(
  path: string,
  init: RequestInit & { accessToken?: string | null; refreshToken?: string | null } = {}
): Promise<BackendResult<T>> {
  const { accessToken, refreshToken, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  if (!headers.has("X-Forwarded-For")) {
    const ip = await visitorIp();
    if (ip) headers.set("X-Forwarded-For", ip);
  }
  if (!headers.has("Content-Type") && rest.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (refreshToken) {
    headers.set("X-Refresh-Token", refreshToken);
  }

  const res = await fetch(`${backendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers,
    cache: "no-store",
  });

  let data = {} as T;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = { error: text } as T;
    }
  }

  return { ok: res.ok, status: res.status, data };
}
