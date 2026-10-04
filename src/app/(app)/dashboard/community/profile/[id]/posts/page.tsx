import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { fetchFeed, fetchProfile } from "@/lib/community";
import { PageTitle } from "@/components/ui";
import { CommunityFeed } from "@/components/dashboard/Community";
import { DashboardUnavailable } from "@/components/dashboard/DashboardParts";

export const metadata: Metadata = { title: "Community Posts" };
export const dynamic = "force-dynamic";

export default async function AuthorPostsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "community")) redirect("/dashboard");

  const { id } = await params;
  const [author, feed] = await Promise.all([fetchProfile(id), fetchFeed({ authorId: id })]);
  if (author === undefined) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={author ? `Community posts — ${author.name}` : "Community posts"}
        subtitle="Posts and auto-announcements by this author, newest first."
        action={
          <Link
            href={`/dashboard/community/profile/${id}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ← Back to profile
          </Link>
        }
      />
      {!feed || !author ? (
        <DashboardUnavailable />
      ) : (
        <CommunityFeed
          initial={feed}
          authorId={id}
          showComposer={false}
          emptyTitle="No posts yet"
          emptyMessage={author.isSelf ? "Your posts will appear here." : `${author.name} has not posted yet.`}
        />
      )}
    </div>
  );
}
