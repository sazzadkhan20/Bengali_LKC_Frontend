import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

/** Quick Input — create submission (proxied to Spring). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const idempotencyKey = req.headers.get("Idempotency-Key");
    const result = await backendAuthedFetch("/api/submissions", {
      method: "POST",
      body: JSON.stringify(body),
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    });
    return result.response;
  } catch (err) {
    console.error("[submissions POST]", err);
    return NextResponse.json({ error: "Submission service unavailable." }, { status: 503 });
  }
}

const BROWSE_PARAMS = ["q", "state", "assignedTo", "contributorId", "page", "size"] as const;

/** Paged browse: queue management, review queues and My Submissions. */
export async function GET(req: Request) {
  try {
    const incoming = new URL(req.url).searchParams;
    const params = new URLSearchParams();
    for (const key of BROWSE_PARAMS) {
      const value = incoming.get(key);
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    const result = await backendAuthedFetch(`/api/submissions${qs ? `?${qs}` : ""}`);
    return result.response;
  } catch (err) {
    console.error("[submissions GET]", err);
    return NextResponse.json({ error: "Submission service unavailable." }, { status: 503 });
  }
}
