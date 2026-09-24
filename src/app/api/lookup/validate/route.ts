import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

/** Live Quick Input validation (writtenForm + POS + synset/ILI). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch("/api/lookup/validate", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.response;
  } catch (err) {
    console.error("[lookup/validate]", err);
    return NextResponse.json({ error: "Validation service unavailable." }, { status: 503 });
  }
}
