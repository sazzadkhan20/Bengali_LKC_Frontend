import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const pos = searchParams.get("pos");
    const qs = new URLSearchParams({ q });
    if (pos) qs.set("pos", pos);
    const result = await backendAuthedFetch(`/api/lookup/synsets?${qs.toString()}`);
    return result.response;
  } catch (err) {
    console.error("[lookup/synsets]", err);
    return NextResponse.json({ error: "Lookup service unavailable." }, { status: 503 });
  }
}
