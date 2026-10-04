import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { fetchProfile } from "@/lib/community";
import { RANKED_ROLES, TIER_ICON, TIER_LABEL, TIER_STYLE } from "@/lib/tiers";
import { formatDate, formatNumber, ROLE_LABEL } from "@/lib/format";
import { Card, PageTitle } from "@/components/ui";
import { AutoAnnounceToggle } from "@/components/dashboard/Community";
import { DashboardUnavailable } from "@/components/dashboard/DashboardParts";

export const metadata: Metadata = { title: "Author Profile" };
export const dynamic = "force-dynamic";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-slate-700">
        {value ? value : <span className="font-normal italic text-slate-400">Not provided</span>}
      </dd>
    </div>
  );
}

export default async function AuthorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "community")) redirect("/dashboard");

  const { id } = await params;
  const author = await fetchProfile(id);
  if (author === undefined) notFound();

  const back = (
    <Link
      href="/dashboard/community"
      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
    >
      ← Back to Community
    </Link>
  );

  if (author === null) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageTitle title="Author Profile" action={back} />
        <DashboardUnavailable />
      </div>
    );
  }

  const standing = author.standing;
  const showPrivate = author.email !== undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={author.isSelf ? "My Profile" : "Author Profile"}
        subtitle="Author information, current leaderboard rank and tier. Profile details are set by the Platform Architect when the account is created."
        action={back}
      />

      <Card className="mb-6">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-2xl font-bold text-white"
            aria-hidden
          >
            {author.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-bold text-slate-900">{author.name}</h2>
            <p className="font-mono text-xs text-slate-400">@{author.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                {ROLE_LABEL[author.role]}
              </span>
              {standing ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TIER_STYLE[standing.tier]}`}
                >
                  <span aria-hidden>{TIER_ICON[standing.tier]}</span> Rank #{standing.rank} · {TIER_LABEL[standing.tier]} ·{" "}
                  {formatNumber(standing.points)} pts
                </span>
              ) : (
                <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                  Not ranked — this role does not earn reward points
                </span>
              )}
              {author.suspended ? (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                  Suspended
                </span>
              ) : null}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center sm:block sm:space-y-1 sm:text-right">
            <div>
              <dt className="text-[11px] text-slate-400">Joined</dt>
              <dd className="text-xs font-semibold text-slate-700">{author.joinedAt ? formatDate(author.joinedAt) : "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">Posts</dt>
              <dd className="text-xs font-semibold tabular-nums text-slate-700">{formatNumber(author.postCount)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">Replies</dt>
              <dd className="text-xs font-semibold tabular-nums text-slate-700">{formatNumber(author.replyCount)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
          <Link
            href={`/dashboard/community/profile/${author.id}/posts`}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
          >
            🗨 Community posts ({formatNumber(author.postCount)})
          </Link>
          {author.isSelf ? (
            <Link
              href="/change-password"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              🔒 Change password
            </Link>
          ) : null}
          {standing ? (
            <Link href="/dashboard/leaderboard" className="text-xs font-semibold text-emerald-700 hover:underline">
              View leaderboard →
            </Link>
          ) : null}
        </div>
      </Card>

      <Card className="mb-6">
        <div className="px-5 py-5 sm:px-6">
          <h3 className="text-sm font-bold text-slate-900">Author information</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Provided by the Platform Architect when the account was created. Contact the Architect to request a correction.
          </p>
          <dl className="mt-3">
            <InfoRow label="Full name" value={author.name} />
            <InfoRow label="Institution" value={author.institution} />
            <InfoRow label="Occupation" value={author.occupation} />
            <InfoRow label="Platform role" value={ROLE_LABEL[author.role]} />
            {showPrivate ? (
              <>
                <InfoRow label="Date of birth" value={author.dob ? formatDate(author.dob) : null} />
                <InfoRow label="Registered email" value={author.email} />
              </>
            ) : null}
          </dl>
          {showPrivate && !author.isSelf ? (
            <p className="mt-2 text-[11px] text-slate-400">
              Date of birth and email are visible only to the author, the Platform Architect and the System Moderator.
            </p>
          ) : null}
        </div>
      </Card>

      {author.isSelf && author.autoAnnounce !== undefined && (RANKED_ROLES as string[]).includes(author.role) ? (
        <Card>
          <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">Milestone auto-announcements</p>
              <p className="mt-0.5 text-xs text-slate-500">
                The system posts on your behalf when you reach a new leaderboard tier or a validated-entry milestone.
              </p>
            </div>
            <AutoAnnounceToggle userId={author.id} enabled={author.autoAnnounce} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
