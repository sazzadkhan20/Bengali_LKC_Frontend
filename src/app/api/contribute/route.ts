import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

const FIELDS = ["name", "email", "phone", "institution", "interestRole", "message", "honeypot"] as const;

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const source = raw as Record<string, unknown>;
  const body: Record<string, string> = {};
  for (const key of FIELDS) {
    const value = source[key];
    if (typeof value === "string") body[key] = value.slice(0, 1000);
  }

  try {
    const result = await backendFetch("/api/public/applications", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (result.status >= 500) {
      return NextResponse.json(
        { error: "We could not record your request right now. Please try again in a few minutes." },
        { status: 503 }
      );
    }
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error("[contribute POST]", err);
    return NextResponse.json(
      { error: "We could not record your request right now. Please try again in a few minutes." },
      { status: 503 }
    );
  }
}
