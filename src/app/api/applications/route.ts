import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams();
    for (const key of ["status", "q", "page", "size"]) {
      const value = searchParams.get(key)?.trim();
      if (value) qs.set(key, value.slice(0, 120));
    }
    const result = await backendAuthedFetch(`/api/applications?${qs.toString()}`);
    return result.response;
  } catch (err) {
    console.error("[applications GET]", err);
    return NextResponse.json({ error: "Application service unavailable." }, { status: 503 });
  }
}
