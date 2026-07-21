import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { recordAudit, store, userById } from "@/lib/store";
import type { ReactionType } from "@/lib/types";

interface CommunityActionPayload {
  action:
    | "react"
    | "reply"
    | "report"
    | "hide"
    | "unhide"
    | "delete"
    | "warn"
    | "suspend";
  type?: ReactionType;
  text?: string;
  reason?: string;
}

const REACTION_TYPES: ReactionType[] = ["LIKE", "UNLIKE", "CELEBRATE"];

/**
 * Author Community Board actions (SRS §14.2 / §14.5): reactions,
 * single-level replies, reporting, and System Moderator moderation.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "community")) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const { id } = await params;
  const post = store.posts.find((p) => p.id === id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  const p = (await req.json().catch(() => ({}))) as CommunityActionPayload;
  const fail = (error: string, status = 422) =>
    NextResponse.json({ error }, { status });
  const canModerate = hasPermission(session.role, "community_moderate");

  switch (p.action) {
    /* ---- reactions: Like / Unlike / Celebrate (SRS §14.2) ---------- */
    case "react": {
      if (!p.type || !REACTION_TYPES.includes(p.type))
        return fail("Unknown reaction type.");
      if (post.hidden) return fail("This post is hidden.");
      const existing = post.reactions.find(
        (r) => r.userId === session.userId
      );
      if (existing && existing.type === p.type) {
        // toggle off
        post.reactions = post.reactions.filter(
          (r) => r.userId !== session.userId
        );
      } else if (existing) {
        existing.type = p.type;
      } else {
        post.reactions.push({ userId: session.userId, type: p.type });
      }
      return NextResponse.json({ ok: true });
    }

    /* ---- single-level replies (SRS §14.2) --------------------------- */
    case "reply": {
      if (post.hidden) return fail("This post is hidden.");
      const text = (p.text ?? "").trim();
      if (!text) return fail("Reply text is required.");
      if (text.length > 200)
        return fail("Replies are limited to 200 characters (SRS §14.2).");
      post.replies.push({
        id: `reply-${store.counters.reply++}`,
        authorId: session.userId,
        text,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    /* ---- report a post for moderator review (SRS §14.2) ------------- */
    case "report": {
      if (post.authorId === session.userId)
        return fail("You cannot report your own post.");
      if (post.reports.some((r) => r.reporterId === session.userId))
        return fail("You have already reported this post.");
      post.reports.push({
        reporterId: session.userId,
        reason: p.reason?.trim() || undefined,
        reportedAt: new Date().toISOString(),
      });
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: "POST_REPORTED",
        targetType: "COMMUNITY",
        targetId: post.id,
        detail: p.reason?.trim().slice(0, 60) || "No reason given",
      });
      return NextResponse.json({ ok: true });
    }

    /* ---- System Moderator actions (SRS §14.5) ------------------------ */
    case "hide":
    case "unhide": {
      if (!canModerate) return fail("Only the System Moderator may moderate posts.", 403);
      post.hidden = p.action === "hide";
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: p.action === "hide" ? "POST_HIDDEN" : "POST_UNHIDDEN",
        targetType: "COMMUNITY",
        targetId: post.id,
        detail: post.text.slice(0, 60),
      });
      return NextResponse.json({ ok: true });
    }
    case "delete": {
      if (!canModerate) return fail("Only the System Moderator may moderate posts.", 403);
      store.posts.splice(
        store.posts.findIndex((x) => x.id === post.id),
        1
      );
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: "POST_DELETED",
        targetType: "COMMUNITY",
        targetId: post.id,
        detail: post.text.slice(0, 60),
      });
      return NextResponse.json({ ok: true });
    }
    case "warn": {
      if (!canModerate) return fail("Only the System Moderator may moderate posts.", 403);
      const author = userById(post.authorId);
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: "AUTHOR_WARNED",
        targetType: "COMMUNITY",
        targetId: post.id,
        detail: `Warning issued to ${author?.name ?? post.authorId} over post ${post.id}`,
      });
      return NextResponse.json({ ok: true });
    }
    case "suspend": {
      if (!canModerate) return fail("Only the System Moderator may moderate posts.", 403);
      const author = userById(post.authorId);
      if (!author) return fail("Author not found.", 404);
      author.suspended = true;
      const credential = store.credentials.find(
        (c) => c.userId === author.id
      );
      if (credential) credential.deactivated = true;
      recordAudit({
        actorId: session.userId,
        actorRole: session.role,
        action: "ACCOUNT_SUSPENDED",
        targetType: "USER",
        targetId: author.id,
        detail: `${author.name} suspended over community post ${post.id} (SRS §14.5)`,
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return fail("Unknown action.");
  }
}
