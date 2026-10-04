import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

const FEED_PARAMS = ["view", "authorId", "page", "size"] as const;

/** Paged feed: ?view=reported (moderators), ?authorId=, ?page=, ?size=. */
export async function GET(req: Request) {
  try {
    const incoming = new URL(req.url).searchParams;
    const qs = new URLSearchParams();
    for (const key of FEED_PARAMS) {
      const value = incoming.get(key);
      if (value) qs.set(key, value);
    }
    const result = await backendAuthedFetch(`/api/community${qs.size ? `?${qs}` : ""}`, { cache: "no-store" });
    return result.response;
  } catch (err) {
    console.error("[community GET]", err);
    return NextResponse.json({ error: "The community board is unavailable. Try again shortly." }, { status: 503 });
  }
}

/** New text post (max 500 characters). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch("/api/community", {
      method: "POST",
      body: JSON.stringify({ text: typeof body?.text === "string" ? body.text : "" }),
    });
    return result.response;
  } catch (err) {
    console.error("[community POST]", err);
    return NextResponse.json({ error: "The community board is unavailable. Try again shortly." }, { status: 503 });
  }
}
