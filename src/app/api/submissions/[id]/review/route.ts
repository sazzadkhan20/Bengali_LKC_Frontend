import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

/** Role-based review decision — policy, state and assignment rules are enforced by Spring. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch(
      `/api/submissions/${encodeURIComponent(id)}/review`,
      { method: "POST", body: JSON.stringify(body) }
    );
    return result.response;
  } catch (err) {
    console.error("[submissions review POST]", err);
    return NextResponse.json({ error: "Review service unavailable." }, { status: 503 });
  }
}
