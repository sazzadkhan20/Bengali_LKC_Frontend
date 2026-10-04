import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const result = await backendAuthedFetch(`/api/arbitration/${encodeURIComponent(id)}`);
    return result.response;
  } catch (err) {
    console.error("[arbitration case GET]", err);
    return NextResponse.json({ error: "Arbitration service unavailable." }, { status: 503 });
  }
}

/**
 * Party note ({action: "note", note}), curator vote ({action: "vote", verdict, rationale}) or
 * System Moderator tie resolution ({action: "resolve_tie", ...Quick Input entry, expectedVersion}).
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch(`/api/arbitration/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.response;
  } catch (err) {
    console.error("[arbitration case POST]", err);
    return NextResponse.json({ error: "Arbitration service unavailable." }, { status: 503 });
  }
}
