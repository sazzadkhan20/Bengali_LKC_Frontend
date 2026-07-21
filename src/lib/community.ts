import "server-only";
import { store, userById } from "./store";
import { standingFor, TIER_ICON, TIER_LABEL } from "./leaderboard";
import { ROLE_LABEL } from "./format";
import type { CommunityPost, Session } from "./types";
import type { PostView } from "@/components/dashboard/Community";

/** Build the serializable post view model for the client components. */
export function buildPostView(
  post: CommunityPost,
  viewer: Session,
  canModerate: boolean
): PostView {
  const author = userById(post.authorId);
  const standing = standingFor(post.authorId);
  const counts = { LIKE: 0, UNLIKE: 0, CELEBRATE: 0 };
  for (const r of post.reactions) counts[r.type] += 1;
  return {
    id: post.id,
    text: post.text,
    auto: post.auto,
    createdAt: post.createdAt,
    hidden: post.hidden,
    authorId: post.authorId,
    authorName: author?.name ?? post.authorId,
    authorRoleLabel: author ? ROLE_LABEL[author.role] : "Unknown",
    authorTierLabel: standing
      ? `${TIER_ICON[standing.tier]} ${TIER_LABEL[standing.tier]}`
      : undefined,
    reactionCounts: counts,
    myReaction:
      post.reactions.find((r) => r.userId === viewer.userId)?.type ?? null,
    replies: post.replies.map((r) => ({
      id: r.id,
      authorId: r.authorId,
      authorName: userById(r.authorId)?.name ?? r.authorId,
      text: r.text,
      createdAt: r.createdAt,
    })),
    reportCount: post.reports.length,
    reportedByMe: post.reports.some((r) => r.reporterId === viewer.userId),
    isMine: post.authorId === viewer.userId,
    reports: canModerate
      ? post.reports.map((r) => ({
          reporterName: userById(r.reporterId)?.name ?? r.reporterId,
          reason: r.reason,
          reportedAt: r.reportedAt,
        }))
      : undefined,
  };
}

/**
 * Reverse-chronological feed (SRS §14.2). Hidden posts are only visible
 * to the System Moderator (SRS §14.5).
 */
export function communityFeed(
  viewer: Session,
  canModerate: boolean,
  filter?: (p: CommunityPost) => boolean
): PostView[] {
  return [...store.posts]
    .filter((p) => (canModerate ? true : !p.hidden))
    .filter((p) => (filter ? filter(p) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => buildPostView(p, viewer, canModerate));
}
