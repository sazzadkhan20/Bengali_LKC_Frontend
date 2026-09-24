import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

/** Quick Input — create submission (proxied to Spring). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch("/api/submissions", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.response;
  } catch (err) {
    console.error("[submissions POST]", err);
    return NextResponse.json({ error: "Submission service unavailable." }, { status: 503 });
  }
}

export async function GET() {
  try {
    const result = await backendAuthedFetch("/api/submissions");
    return result.response;
  } catch (err) {
    console.error("[submissions GET]", err);
    return NextResponse.json({ error: "Submission service unavailable." }, { status: 503 });
  }
}
