import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

/** Review pipeline actions (SRS §5.2) — state rules and permissions are enforced by Spring. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch(
      `/api/submissions/${encodeURIComponent(id)}/action`,
      { method: "POST", body: JSON.stringify(body) }
    );
    return result.response;
  } catch (err) {
    console.error("[submissions action POST]", err);
    return NextResponse.json({ error: "Submission service unavailable." }, { status: 503 });
  }
}
