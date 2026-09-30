import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

/** Owner disputes a FLAGGED / C_FLAGGED decision; opens an arbitration case. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch(
      `/api/submissions/${encodeURIComponent(id)}/dispute`,
      { method: "POST", body: JSON.stringify(body) }
    );
    return result.response;
  } catch (err) {
    console.error("[submissions dispute POST]", err);
    return NextResponse.json({ error: "Dispute service unavailable." }, { status: 503 });
  }
}
