import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ?? "0";
    const size = searchParams.get("size") ?? "15";
    const q = searchParams.get("q") ?? "";
    const role = searchParams.get("role") ?? "ALL";
    const status = searchParams.get("status") ?? "ALL";
    const qs = new URLSearchParams({
      page,
      size,
      ...(q ? { q } : {}),
      ...(role && role !== "ALL" ? { role } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
    });
    const result = await backendAuthedFetch(`/api/users?${qs.toString()}`);
    return result.response;
  } catch (err) {
    console.error("[users GET]", err);
    return NextResponse.json({ error: "User service unavailable." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch("/api/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.response;
  } catch (err) {
    console.error("[users POST]", err);
    return NextResponse.json({ error: "User service unavailable." }, { status: 503 });
  }
}
