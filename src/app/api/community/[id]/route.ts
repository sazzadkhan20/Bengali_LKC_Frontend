import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Post actions: react, reply, report, and (System Moderator) hide, unhide, dismiss_reports,
 * delete, warn, suspend. The response carries the updated post, or `deleted: true`.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch(`/api/community/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.response;
  } catch (err) {
    console.error("[community action]", err);
    return NextResponse.json({ error: "The community board is unavailable. Try again shortly." }, { status: 503 });
  }
}
