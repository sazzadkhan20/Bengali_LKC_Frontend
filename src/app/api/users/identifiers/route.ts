import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

export async function GET() {
  try {
    const result = await backendAuthedFetch("/api/users/identifiers");
    return result.response;
  } catch (err) {
    console.error("[users/identifiers]", err);
    return NextResponse.json({ error: "User service unavailable." }, { status: 503 });
  }
}
