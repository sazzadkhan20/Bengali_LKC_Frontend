import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ili = searchParams.get("ili") ?? "";
    const pos = searchParams.get("pos") ?? "";
    const qs = new URLSearchParams({ ili });
    if (pos) qs.set("pos", pos);
    const result = await backendAuthedFetch(`/api/lookup/validate/ili?${qs.toString()}`);
    return result.response;
  } catch (err) {
    console.error("[lookup/validate/ili]", err);
    return NextResponse.json({ error: "ILI validation unavailable." }, { status: 503 });
  }
}
