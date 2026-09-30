import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store, userById } from "@/lib/store";
import {
  standingFor,
  TIER_ICON,
  TIER_LABEL,
  TIER_STYLE,
} from "@/lib/leaderboard";
import { formatDate, ROLE_LABEL } from "@/lib/format";
import { Card, PageTitle } from "@/components/ui";
import { AutoAnnounceToggle } from "@/components/dashboard/Community";

export const metadata: Metadata = { title: "Author Profile" };

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-700">{value}</dd>
    </div>
  );
}

export default async function AuthorProfilePage({
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

  const standing = standingFor(author.id);
  const isSelf = session.userId === author.id;
  const postCount = store.posts.filter(
    (p) => p.authorId === author.id && !p.hidden
  ).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Author Profile"
        subtitle="Author information, current leaderboard rank and tier. Profile details are filled in by the Platform Architect at account creation."
        action={
          <Link
            href="/dashboard/community"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ← Back to Community
          </Link>
        }
      />

      {/* identity + rank */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-5 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 text-2xl font-bold text-white">
            {author.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{author.name}</h2>
            <p className="font-mono text-xs text-slate-400">@{author.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                {ROLE_LABEL[author.role]}
              </span>
              {standing ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TIER_STYLE[standing.tier]}`}
                >
                  {TIER_ICON[standing.tier]} Rank #{standing.rank} ·{" "}
                  {TIER_LABEL[standing.tier]} tier · {standing.points} pts
                </span>
              ) : (
                <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-200">
                  Not ranked (no reward points for this role)
                </span>
              )}
            </div>
          </div>
          <div className="ml-auto text-right text-xs text-slate-400">
            <p>
              Joined{" "}
              <strong className="text-slate-600">
                {formatDate(author.joinedAt)}
              </strong>
            </p>
            <p className="mt-0.5">
              {postCount} community post{postCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* action buttons */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-6 py-4">
          <Link
            href={`/dashboard/community/profile/${author.id}/posts`}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
          >
            🗨 Community Posts ({postCount})
          </Link>
          {isSelf ? (
            <Link
              href="/change-password"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              🔒 Change Password
            </Link>
          ) : null}
        </div>
      </Card>

      {/* author information (filled by the Platform Architect) */}
      <Card className="mb-6">
        <div className="px-6 py-5">
          <h3 className="text-sm font-bold text-slate-900">
            Author information
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Provided by the Platform Architect when the account credential was
            created. Contact the Architect to request a correction.
          </p>
          <dl className="mt-3">
            <InfoRow label="Full name" value={author.name} />
            <InfoRow label="Date of birth" value={formatDate(author.dob)} />
            <InfoRow label="Institution" value={author.institution} />
            <InfoRow label="Occupation" value={author.occupation} />
            <InfoRow label="Platform role" value={ROLE_LABEL[author.role]} />
            <InfoRow label="Registered email" value={author.email} />
          </dl>
        </div>
      </Card>

      {isSelf ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Milestone auto-announcements
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                The system posts on your behalf when you reach a new
                leaderboard tier or a validated-entry milestone.
              </p>
            </div>
            <AutoAnnounceToggle userId={author.id} enabled={author.autoAnnounce} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
