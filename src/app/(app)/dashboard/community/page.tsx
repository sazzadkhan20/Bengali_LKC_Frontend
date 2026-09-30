import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { communityFeed } from "@/lib/community";
import { Card, CardHeader, EmptyState, PageTitle } from "@/components/ui";
import { PostCard, PostComposer } from "@/components/dashboard/Community";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "community")) redirect("/dashboard");

  const canModerate = hasPermission(session.role, "community_moderate");
  const params = await searchParams;
  const reportedOnly = canModerate && params.view === "reported";

  const posts = communityFeed(
    session,
    canModerate,
    reportedOnly ? (p) => p.reports.length > 0 : undefined
  );
  const reportedCount = canModerate
    ? communityFeed(session, true, (p) => p.reports.length > 0).length
    : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Author Community Board"
        subtitle="An internal space for authenticated authors to share short updates, blockers, milestones and rank changes. Not visible to Visitors."
        action={
          canModerate ? (
            <div className="flex gap-2">
              <Link
                href="/dashboard/community"
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                  !reportedOnly
                    ? "bg-slate-800 text-white ring-slate-800"
                    : "bg-white text-slate-600 ring-slate-300"
                }`}
              >
                All posts
              </Link>
              <Link
                href="/dashboard/community?view=reported"
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                  reportedOnly
                    ? "bg-slate-800 text-white ring-slate-800"
                    : "bg-white text-slate-600 ring-slate-300"
                }`}
              >
                🚩 Reported ({reportedCount})
              </Link>
            </div>
          ) : (
            <Link
              href={`/dashboard/community/profile/${session.userId}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              My Profile & Settings
            </Link>
          )
        }
      />

      {canModerate && reportedCount > 0 && !reportedOnly ? (
        <Link
          href="/dashboard/community?view=reported"
          className="mb-6 block rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
        >
          🚩 {reportedCount} reported post{reportedCount === 1 ? "" : "s"} awaiting
          moderator review →
        </Link>
      ) : null}

      {!reportedOnly ? (
        <Card className="mb-6">
          <CardHeader
            title="Share with the community"
            subtitle="Text-only posts, max 500 characters — no images, video or attachments"
          />
          <div className="p-5">
            <PostComposer />
          </div>
        </Card>
      ) : null}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <EmptyState
            title={reportedOnly ? "No reported posts" : "No posts yet"}
            message={
              reportedOnly
                ? "Reported posts appear here for moderator review (hide/delete, warn/suspend)."
                : "Be the first to share an update with your fellow authors."
            }
          />
        ) : (
          posts.map((p) => (
            <PostCard key={p.id} post={p} canModerate={canModerate} />
          ))
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        Milestone auto-announcements are posted on your behalf when you reach
        a new leaderboard tier or hit a validated-entry milestone. You can
        opt out from your{" "}
        <Link
          href={`/dashboard/community/profile/${session.userId}`}
          className="font-semibold text-emerald-700 hover:underline"
        >
          author profile
        </Link>
        . Reported posts are reviewed by the System Moderator.
      </p>
    </div>
  );
}
