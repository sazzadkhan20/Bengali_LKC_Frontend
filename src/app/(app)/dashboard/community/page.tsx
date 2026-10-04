import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { fetchFeed } from "@/lib/community";
import { RANKED_ROLES } from "@/lib/tiers";
import { PageTitle } from "@/components/ui";
import { CommunityFeed } from "@/components/dashboard/Community";
import { DashboardUnavailable } from "@/components/dashboard/DashboardParts";

export const metadata: Metadata = { title: "Community" };
export const dynamic = "force-dynamic";

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "community")) redirect("/dashboard");

  const canModerate = hasPermission(session.role, "community_moderate");
  const ranked = (RANKED_ROLES as string[]).includes(session.role);
  const params = await searchParams;
  const reportedOnly = canModerate && params.view === "reported";
  const feed = await fetchFeed({ view: reportedOnly ? "reported" : undefined });
  const reportedCount = feed?.reportedCount ?? 0;

  const tab = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
      active ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
    }`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Author Community Board"
        subtitle="An internal space for signed-in authors to share short updates, blockers, milestones and rank changes. Not visible to visitors."
        action={
          <div className="flex flex-wrap gap-2">
            {canModerate ? (
              <nav aria-label="Community views" className="flex flex-wrap gap-2">
                <Link href="/dashboard/community" aria-current={!reportedOnly ? "page" : undefined} className={tab(!reportedOnly)}>
                  All posts
                </Link>
                <Link
                  href="/dashboard/community?view=reported"
                  aria-current={reportedOnly ? "page" : undefined}
                  className={tab(reportedOnly)}
                >
                  🚩 Reported ({reportedCount})
                </Link>
              </nav>
            ) : null}
            <Link
              href={`/dashboard/community/profile/${session.userId}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              My profile
            </Link>
          </div>
        }
      />

      {canModerate && reportedCount > 0 && !reportedOnly ? (
        <Link
          href="/dashboard/community?view=reported"
          className="mb-6 block rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
        >
          🚩 {reportedCount} reported post{reportedCount === 1 ? "" : "s"} awaiting moderator review →
        </Link>
      ) : null}

      {!feed ? (
        <DashboardUnavailable />
      ) : (
        <CommunityFeed
          key={reportedOnly ? "reported" : "all"}
          initial={feed}
          view={reportedOnly ? "reported" : undefined}
          showComposer={!reportedOnly}
          emptyTitle={reportedOnly ? "No reported posts" : "No posts yet"}
          emptyMessage={
            reportedOnly
              ? "Reported posts appear here for review. You can dismiss the reports, hide or delete the post, or warn or suspend the author."
              : "Be the first to share an update with your fellow authors."
          }
        />
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        {ranked ? (
          <>
            Milestone auto-announcements are posted on your behalf when you reach a new leaderboard tier or a
            validated-entry milestone. You can turn them off from your{" "}
            <Link
              href={`/dashboard/community/profile/${session.userId}`}
              className="font-semibold text-emerald-700 hover:underline"
            >
              author profile
            </Link>
            .{" "}
          </>
        ) : null}
        {canModerate
          ? "Reported posts, hides, deletions, warnings and suspensions are recorded in the audit trail."
          : "Reported posts are reviewed by the System Moderator."}
      </p>
    </div>
  );
}
