import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { userById } from "@/lib/store";
import { communityFeed } from "@/lib/community";
import { Card, CardHeader, EmptyState, PageTitle } from "@/components/ui";
import { PostCard } from "@/components/dashboard/Community";

export const metadata: Metadata = { title: "Community Posts" };

export default async function AuthorPostsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "community")) redirect("/dashboard");

  const { id } = await params;
  const author = userById(id);
  if (!author) notFound();

  const canModerate = hasPermission(session.role, "community_moderate");
  const posts = communityFeed(session, canModerate, (p) => p.authorId === author.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={`Community Posts — ${author.name}`}
        subtitle="This author's community post history, newest first (SRS §14.2)."
        action={
          <Link
            href={`/dashboard/community/profile/${author.id}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ← Back to Profile
          </Link>
        }
      />

      <Card>
        <CardHeader
          title={`Post history (${posts.length})`}
          subtitle="Posts and auto-announcements published by this author"
        />
      </Card>
      <div className="mt-4 space-y-4">
        {posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            message="Posts by this author will appear here."
          />
        ) : (
          posts.map((p) => (
            <PostCard key={p.id} post={p} canModerate={canModerate} />
          ))
        )}
      </div>
    </div>
  );
}
