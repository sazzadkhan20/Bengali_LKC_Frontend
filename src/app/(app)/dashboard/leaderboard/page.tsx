import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import {
  TIER_ICON,
  TIER_LABEL,
  TIER_STYLE,
  type LeaderboardConfig,
  type LeaderboardResponse,
  type LeaderboardRow,
} from "@/lib/tiers";
import { formatNumber, ROLE_LABEL } from "@/lib/format";
import { Card, CardHeader, PageTitle } from "@/components/ui";
import { DashboardUnavailable } from "@/components/dashboard/DashboardParts";
import type { LeaderboardTier, RankedRole } from "@/lib/types";

export const metadata: Metadata = { title: "Leader Board" };
export const dynamic = "force-dynamic";

const BOARDS: { key: string; role: RankedRole; label: string }[] = [
  { key: "contributor", role: "CONTRIBUTOR", label: "Lexical Contributors" },
  { key: "editor", role: "LEXICAL_EDITOR", label: "Lexical Editors" },
  { key: "chief", role: "CHIEF_LEXICAL_EDITOR", label: "Chief Lexical Editors" },
];

function TierBadge({ tier, large = false }: { tier: LeaderboardTier; large?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${TIER_STYLE[tier]} ${
        large ? "px-3 py-1 text-lg font-bold" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <span aria-hidden>{TIER_ICON[tier]}</span> {TIER_LABEL[tier]}
    </span>
  );
}

function nextTierText(r: LeaderboardRow): string {
  return r.nextTier && r.toNextTier !== null
    ? `${formatNumber(r.toNextTier)} pts to ${TIER_LABEL[r.nextTier]}`
    : "Top tier reached";
}

function YouBadge() {
  return (
    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-emerald-700">
      you
    </span>
  );
}

function BoardTable({ rows, highlightUserId }: { rows: LeaderboardRow[]; highlightUserId?: string }) {
  if (rows.length === 0) {
    return <p className="px-5 py-6 text-sm italic text-slate-400">No active authors hold this role yet.</p>;
  }
  return (
    <>
      <ol className="divide-y divide-slate-50 sm:hidden">
        {rows.map((r) => (
          <li
            key={r.userId}
            className={`flex items-start gap-3 px-4 py-3 ${r.userId === highlightUserId ? "bg-emerald-50/60" : ""}`}
          >
            <span className="w-9 shrink-0 pt-0.5 font-bold tabular-nums text-slate-400">#{r.rank}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800">
                {r.name}
                {r.userId === highlightUserId ? <YouBadge /> : null}
              </p>
              <p className="font-mono text-[11px] text-slate-400">@{r.username}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <TierBadge tier={r.tier} />
                <span className="text-[11px] text-slate-400">{nextTierText(r)}</span>
              </div>
            </div>
            <span className="shrink-0 text-right">
              <span className="block text-base font-bold tabular-nums text-emerald-700">{formatNumber(r.points)}</span>
              <span className="text-[10px] text-slate-400">points</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="thin-scroll hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="w-16 px-5 py-3 font-semibold">Rank</th>
              <th className="px-3 py-3 font-semibold">Author</th>
              <th className="px-3 py-3 font-semibold">Tier</th>
              <th className="px-3 py-3 text-right font-semibold">Validated entries</th>
              <th className="px-3 py-3 text-right font-semibold">Reward points</th>
              <th className="px-5 py-3 text-right font-semibold">Next tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r) => (
              <tr key={r.userId} className={r.userId === highlightUserId ? "bg-emerald-50/60" : ""}>
                <td className="px-5 py-3 font-bold tabular-nums text-slate-400">#{r.rank}</td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-800">
                    {r.name}
                    {r.userId === highlightUserId ? <YouBadge /> : null}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">@{r.username}</p>
                </td>
                <td className="px-3 py-3">
                  <TierBadge tier={r.tier} />
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-600">{formatNumber(r.validatedEntries)}</td>
                <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-emerald-700">
                  {formatNumber(r.points)}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right text-xs text-slate-400">{nextTierText(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function tierFloor(tier: LeaderboardTier, c: LeaderboardConfig): number {
  switch (tier) {
    case "GOLD":
      return c.tierGoldMin;
    case "SILVER":
      return c.tierSilverMin;
    case "BRONZE":
      return c.tierBronzeMin;
    default:
      return 0;
  }
}

function MyStanding({ me, total, config }: { me: LeaderboardRow; total: number; config: LeaderboardConfig }) {
  const floor = tierFloor(me.tier, config);
  const ceiling = me.nextTier ? tierFloor(me.nextTier, config) : null;
  const pct = ceiling === null ? 100 : Math.min(100, ((me.points - floor) / Math.max(ceiling - floor, 1)) * 100);
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">My rank</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
          #{me.rank}
          <span className="ml-2 text-sm font-medium text-slate-400">of {total}</span>
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cumulative reward points</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-700">{formatNumber(me.points)}</p>
        <p className="mt-1 text-xs text-slate-400">
          from {formatNumber(me.validatedEntries)} validated entr{me.validatedEntries === 1 ? "y" : "ies"}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current tier</p>
        <p className="mt-2">
          <TierBadge tier={me.tier} large />
        </p>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Progress to the next tier"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {me.nextTier && me.toNextTier !== null
            ? `${formatNumber(me.toNextTier)} more point${me.toNextTier === 1 ? "" : "s"} to reach ${TIER_LABEL[me.nextTier]}`
            : "Highest tier reached"}
        </p>
      </div>
    </div>
  );
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const ranked = hasPermission(session.role, "leaderboard_ranked");
  const params = await searchParams;
  const active = BOARDS.find((b) => b.key === params.board) ?? BOARDS[0];
  const query = ranked ? "" : `?role=${active.role}`;
  const res = await backendAuthedFetch<LeaderboardResponse>(`/api/dashboard/leaderboard${query}`, { cache: "no-store" });
  const data = res.ok ? res.data : null;

  if (ranked) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageTitle
          title="Leader Board"
          subtitle={
            data
              ? `Independent ${ROLE_LABEL[session.role]} leaderboard. Reward points (${data.config.rewardPointPerEntry} per entry) are credited only when an entry reaches Validated.`
              : `Independent ${ROLE_LABEL[session.role]} leaderboard.`
          }
        />
        {!data ? (
          <DashboardUnavailable />
        ) : (
          <>
            {data.me ? <MyStanding me={data.me} total={data.rows.length} config={data.config} /> : null}
            <Card>
              <CardHeader
                title={`${ROLE_LABEL[session.role]} leaderboard`}
                subtitle="Ranked by cumulative reward points — your rank is never compared against other roles"
              />
              <BoardTable rows={data.rows} highlightUserId={session.userId} />
            </Card>
            <TierLegend config={data.config} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Leader Board"
        subtitle="Read-only view of all three role leaderboards. Your role does not earn points and is not ranked."
      />

      <nav aria-label="Leaderboards" className="mb-4 flex flex-wrap gap-1.5">
        {BOARDS.map((b) => (
          <Link
            key={b.key}
            href={`/dashboard/leaderboard?board=${b.key}`}
            aria-current={active.key === b.key ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              active.key === b.key
                ? "bg-slate-800 text-white ring-slate-800"
                : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
            }`}
          >
            {b.label}
          </Link>
        ))}
      </nav>

      {!data ? (
        <DashboardUnavailable />
      ) : (
        <>
          <Card>
            <CardHeader
              title={`${active.label} leaderboard`}
              subtitle={`Point value: ${data.config.rewardPointPerEntry} per validated entry (configurable by the Platform Architect)`}
            />
            <BoardTable rows={data.rows} />
          </Card>
          <TierLegend config={data.config} />
        </>
      )}
    </div>
  );
}

function TierLegend({ config: c }: { config: LeaderboardConfig }) {
  const tiers = [
    { tier: "GOLD" as const, min: c.tierGoldMin, desc: "Outstanding and sustained contributions to the Bengali LKC." },
    { tier: "SILVER" as const, min: c.tierSilverMin, desc: "Substantial and reliable contributions with strong commitment." },
    { tier: "BRONZE" as const, min: c.tierBronzeMin, desc: "Meaningful contributions and an active community presence." },
    { tier: "PROVISIONAL" as const, min: 0, desc: "Entry-level tier for newly registered authors." },
  ];
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiers.map((t) => (
        <div key={t.tier} className="rounded-xl border border-slate-200 bg-white p-4">
          <TierBadge tier={t.tier} />
          <p className="mt-2 text-xs font-bold text-slate-700">{formatNumber(t.min)}+ points</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.desc}</p>
        </div>
      ))}
    </div>
  );
}
