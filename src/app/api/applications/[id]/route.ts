import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await backendAuthedFetch(`/api/applications/${encodeURIComponent(id)}`);
    return result.response;
  } catch (err) {
    console.error("[application GET]", err);
    return NextResponse.json({ error: "Application service unavailable." }, { status: 503 });
  }
}
