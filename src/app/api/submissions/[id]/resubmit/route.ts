import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

/** Owner's corrected resubmission of a FLAGGED / C_FLAGGED entry; full validation runs in Spring. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch(
      `/api/submissions/${encodeURIComponent(id)}/resubmit`,
      { method: "POST", body: JSON.stringify(body) }
    );
    return result.response;
  } catch (err) {
    console.error("[submissions resubmit POST]", err);
    return NextResponse.json({ error: "Resubmission service unavailable." }, { status: 503 });
  }
}
