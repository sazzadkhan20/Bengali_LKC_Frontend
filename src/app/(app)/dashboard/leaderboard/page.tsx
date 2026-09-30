import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store } from "@/lib/store";
import {
  leaderboardFor,
  standingFor,
  TIER_ICON,
  TIER_LABEL,
  TIER_STYLE,
  type LeaderboardRow,
} from "@/lib/leaderboard";
import { ROLE_LABEL } from "@/lib/format";
import { Card, CardHeader, PageTitle } from "@/components/ui";
import type { RankedRole } from "@/lib/types";

export const metadata: Metadata = { title: "Leader Board" };

const BOARDS: { key: string; role: RankedRole; label: string }[] = [
  { key: "contributor", role: "CONTRIBUTOR", label: "Lexical Contributors" },
  { key: "editor", role: "LEXICAL_EDITOR", label: "Lexical Editors" },
  { key: "chief", role: "CHIEF_LEXICAL_EDITOR", label: "Chief Lexical Editors" },
];

function BoardTable({
  rows,
  highlightUserId,
}: {
  rows: LeaderboardRow[];
  highlightUserId?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-6 text-sm italic text-slate-400">
        No ranked authors in this role yet.
      </p>
    );
  }
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
            <th className="w-14 px-5 py-3 font-semibold">Rank</th>
            <th className="px-3 py-3 font-semibold">Author</th>
            <th className="px-3 py-3 font-semibold">Tier</th>
            <th className="px-3 py-3 text-right font-semibold">Reward points</th>
            <th className="px-5 py-3 text-right font-semibold">Next tier</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((r) => (
            <tr
              key={r.userId}
              className={
                r.userId === highlightUserId ? "bg-emerald-50/60" : ""
              }
            >
              <td className="px-5 py-3 font-bold tabular-nums text-slate-400">
                #{r.rank}
              </td>
              <td className="px-3 py-3">
                <p className="font-semibold text-slate-800">
                  {r.name}
                  {r.userId === highlightUserId ? (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      you
                    </span>
                  ) : null}
                </p>
                <p className="font-mono text-[11px] text-slate-400">
                  @{r.username}
                </p>
              </td>
              <td className="px-3 py-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TIER_STYLE[r.tier]}`}
                >
                  {TIER_ICON[r.tier]} {TIER_LABEL[r.tier]}
                </span>
              </td>
              <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-emerald-700">
                {r.points}
              </td>
              <td className="px-5 py-3 text-right text-xs text-slate-400">
                {r.nextTier
                  ? `${r.toNextTier} pts to ${TIER_LABEL[r.nextTier]}`
                  : "Top tier reached"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const ranked = hasPermission(session.role, "leaderboard_ranked");
  const c = store.config;

  /* Ranked authors see only their own role's leaderboard (SRS §7.8). */
  if (ranked) {
    const me = standingFor(session.userId);
    const rows = leaderboardFor(session.role as RankedRole);
    return (
      <div className="mx-auto max-w-5xl">
        <PageTitle
          title="Leader Board"
          subtitle={`Independent ${ROLE_LABEL[session.role]} leaderboard. A reward point (${c.rewardPointPerEntry} per entry) is credited only when an entry reaches VALIDATED.`}
        />

        {me ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                My rank
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                #{me.rank}
                <span className="ml-2 text-sm font-medium text-slate-400">
                  of {rows.length}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cumulative reward points
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-700">
                {me.points}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Current tier
              </p>
              <p className="mt-2 text-2xl font-bold">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-bold ring-1 ring-inset ${TIER_STYLE[me.tier]}`}
                >
                  {TIER_ICON[me.tier]} {TIER_LABEL[me.tier]}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-slate-400">
                {me.nextTier
                  ? `${me.toNextTier} more point${me.toNextTier === 1 ? "" : "s"} to reach ${TIER_LABEL[me.nextTier]}`
                  : "Highest tier reached"}
              </p>
            </div>
          </div>
        ) : null}

        <Card>
          <CardHeader
            title={`${ROLE_LABEL[session.role]} leaderboard`}
            subtitle="Ranked by cumulative reward points — your rank is never compared against other roles"
          />
          <BoardTable rows={rows} highlightUserId={session.userId} />
        </Card>

        <TierLegend />
      </div>
    );
  }

  /* Architect / Moderator / Curator: read-only view of all three boards. */
  const params = await searchParams;
  const active =
    BOARDS.find((b) => b.key === params.board) ?? BOARDS[0];

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Leader Board"
        subtitle="Read-only view of all three role leaderboards. Your role does not earn points and is not ranked."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {BOARDS.map((b) => (
          <Link
            key={b.key}
            href={`/dashboard/leaderboard?board=${b.key}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              active.key === b.key
                ? "bg-slate-800 text-white ring-slate-800"
                : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
            }`}
          >
            {b.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader
          title={`${active.label} leaderboard`}
          subtitle={`Point value: ${c.rewardPointPerEntry} per validated entry (configurable by the Platform Architect)`}
        />
        <BoardTable rows={leaderboardFor(active.role)} />
      </Card>

      <TierLegend />
    </div>
  );
}

function TierLegend() {
  const c = store.config;
  const tiers = [
    { tier: "GOLD" as const, min: c.tierGoldMin, desc: "Outstanding and sustained contributions to the Bengali LKC." },
    { tier: "SILVER" as const, min: c.tierSilverMin, desc: "Substantial and reliable contributions with strong commitment." },
    { tier: "BRONZE" as const, min: c.tierBronzeMin, desc: "Meaningful contributions and an active community presence." },
    { tier: "PROVISIONAL" as const, min: 0, desc: "Entry-level tier for newly registered authors." },
  ];
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiers.map((t) => (
        <div
          key={t.tier}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TIER_STYLE[t.tier]}`}
          >
            {TIER_ICON[t.tier]} {TIER_LABEL[t.tier]}
          </span>
          <p className="mt-2 text-xs font-bold text-slate-700">
            {t.min}+ points
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.desc}</p>
        </div>
      ))}
    </div>
  );
}
