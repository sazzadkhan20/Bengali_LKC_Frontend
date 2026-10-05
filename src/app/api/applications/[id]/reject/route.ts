import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await backendAuthedFetch(`/api/applications/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify({
        note: typeof body?.note === "string" ? body.note : "",
        notify: body?.notify !== false,
      }),
    });
    return result.response;
  } catch (err) {
    console.error("[application reject]", err);
    return NextResponse.json({ error: "Application service unavailable." }, { status: 503 });
  }
}
