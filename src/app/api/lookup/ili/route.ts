import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const word = searchParams.get("word") ?? "";
    const pos = searchParams.get("pos") ?? "any";
    const qs = new URLSearchParams({ word, pos });
    const result = await backendAuthedFetch(`/api/lookup/ili?${qs.toString()}`);
    return result.response;
  } catch (err) {
    console.error("[lookup/ili]", err);
    return NextResponse.json({ error: "ILI lookup unavailable." }, { status: 503 });
  }
}
