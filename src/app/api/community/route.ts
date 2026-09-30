import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { recordAudit, store } from "@/lib/store";

/**
 * Author Community Board — post composer (SRS §14.2).
 * Short text-only posts, maximum 500 characters. Restricted entirely to
 * authenticated authors (SRS §14.4).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "community")) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const p = (await req.json().catch(() => ({}))) as { text?: string };
  const text = (p.text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      { error: "Post text is required." },
      { status: 422 }
    );
  }
  if (text.length > 500) {
    return NextResponse.json(
      { error: "Posts are limited to 500 characters." },
      { status: 422 }
    );
  }

  const post = {
    id: `post-${store.counters.post++}`,
    authorId: session.userId,
    auto: false,
    text,
    createdAt: new Date().toISOString(),
    reactions: [],
    replies: [],
    reports: [],
    hidden: false,
  };
  store.posts.push(post);
  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: "POST_CREATED",
    targetType: "COMMUNITY",
    targetId: post.id,
    detail: text.slice(0, 60),
  });
  return NextResponse.json({ ok: true, id: post.id });
}
