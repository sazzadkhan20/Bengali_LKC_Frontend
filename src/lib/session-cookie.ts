import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

/** Cookie options compatible with HTTPS and the HF Spaces iframe proxy. */
export function sessionCookieOptions(
  maxAge: number
): Partial<ResponseCookie> {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    path: "/",
    maxAge,
    secure,
    // HF embeds *.hf.space inside huggingface.co — Lax cookies are blocked there.
    sameSite: secure ? "none" : "lax",
  };
}

export function clearSessionCookieOptions(): Partial<ResponseCookie> {
  return { ...sessionCookieOptions(0), maxAge: 0 };
}
