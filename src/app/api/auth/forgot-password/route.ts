import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const result = await backendFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error("[auth/forgot-password]", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 }
    );
  }
}
