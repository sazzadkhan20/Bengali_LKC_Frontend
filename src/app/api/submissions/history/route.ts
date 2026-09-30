import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

const HISTORY_PARAMS = ["q", "state", "page", "size"] as const;

/** My Review History / My Validation History (proxied to Spring). */
export async function GET(req: Request) {
  try {
    const incoming = new URL(req.url).searchParams;
    const params = new URLSearchParams();
    for (const key of HISTORY_PARAMS) {
      const value = incoming.get(key);
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    const result = await backendAuthedFetch(`/api/submissions/history${qs ? `?${qs}` : ""}`);
    return result.response;
  } catch (err) {
    console.error("[submissions history GET]", err);
    return NextResponse.json({ error: "Review history service unavailable." }, { status: 503 });
  }
}
