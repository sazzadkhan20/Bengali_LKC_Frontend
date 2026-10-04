import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

const BROWSE_PARAMS = ["q", "phase", "page", "size"] as const;

/** Paged arbitration cases, scoped by role on the backend. */
export async function GET(req: Request) {
  try {
    const incoming = new URL(req.url).searchParams;
    const params = new URLSearchParams();
    for (const key of BROWSE_PARAMS) {
      const value = incoming.get(key);
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    const result = await backendAuthedFetch(`/api/arbitration${qs ? `?${qs}` : ""}`);
    return result.response;
  } catch (err) {
    console.error("[arbitration GET]", err);
    return NextResponse.json({ error: "Arbitration service unavailable." }, { status: 503 });
  }
}
