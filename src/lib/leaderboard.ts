import "server-only";
import { rewardPointsByRole, store, tierForPoints, userById } from "./store";
import type { LeaderboardTier, RankedRole } from "./types";

export const RANKED_ROLES: RankedRole[] = [
  "CONTRIBUTOR",
  "LEXICAL_EDITOR",
  "CHIEF_LEXICAL_EDITOR",
];

export const TIER_LABEL: Record<LeaderboardTier, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
  PROVISIONAL: "Provisional",
};

export const TIER_ICON: Record<LeaderboardTier, string> = {
  GOLD: "🥇",
  SILVER: "🥈",
  BRONZE: "🥉",
  PROVISIONAL: "🌱",
};

/** Tailwind badge classes per tier, consistent with the platform palette. */
export const TIER_STYLE: Record<LeaderboardTier, string> = {
  GOLD: "bg-amber-50 text-amber-800 ring-amber-200",
  SILVER: "bg-slate-100 text-slate-600 ring-slate-300",
  BRONZE: "bg-orange-50 text-orange-700 ring-orange-200",
  PROVISIONAL: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  username: string;
  points: number;
  tier: LeaderboardTier;
  /** Points still needed to reach the next tier (null when Gold). */
  toNextTier: number | null;
  nextTier: LeaderboardTier | null;
}

function nextTierOf(points: number): { tier: LeaderboardTier; min: number } | null {
  const c = store.config;
  if (points < c.tierBronzeMin) return { tier: "BRONZE", min: c.tierBronzeMin };
  if (points < c.tierSilverMin) return { tier: "SILVER", min: c.tierSilverMin };
  if (points < c.tierGoldMin) return { tier: "GOLD", min: c.tierGoldMin };
  return null;
}

/**
 * Independent per-role leaderboard (SRS §7.8): authors are ranked by
 * cumulative reward points within their own role only.
 */
export function leaderboardFor(role: RankedRole): LeaderboardRow[] {
  const points = rewardPointsByRole()[role];
  const rows = store.users
    .filter((u) => u.role === role && u.active)
    .map((u) => {
      const p = points.get(u.id) ?? 0;
      const next = nextTierOf(p);
      return {
        rank: 0,
        userId: u.id,
        name: u.name,
        username: u.username,
        points: p,
        tier: tierForPoints(p),
        toNextTier: next ? next.min - p : null,
        nextTier: next ? next.tier : null,
      } satisfies LeaderboardRow;
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  // Standard competition ranking: equal points share the same rank.
  let lastPoints = Number.NaN;
  let lastRank = 0;
  rows.forEach((row, i) => {
    if (row.points !== lastPoints) {
      lastRank = i + 1;
      lastPoints = row.points;
    }
    row.rank = lastRank;
  });
  return rows;
}

/** Personal leaderboard standing for a ranked author (SRS §7.8). */
export function standingFor(
  userId: string
): (LeaderboardRow & { role: RankedRole }) | null {
  const user = userById(userId);
  if (!user || !RANKED_ROLES.includes(user.role as RankedRole)) return null;
  const role = user.role as RankedRole;
  const row = leaderboardFor(role).find((r) => r.userId === userId);
  return row ? { ...row, role } : null;
}
