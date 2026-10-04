import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

/** System configuration — Platform Architect only (enforced by the backend). */
export async function GET() {
  try {
    return (await backendAuthedFetch("/api/config", { cache: "no-store" })).response;
  } catch {
    return NextResponse.json({ error: "Configuration service unavailable." }, { status: 503 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch("/api/config", { method: "PUT", body: JSON.stringify(body) });
    return result.response;
  } catch {
    return NextResponse.json({ error: "Configuration service unavailable." }, { status: 503 });
  }
}
