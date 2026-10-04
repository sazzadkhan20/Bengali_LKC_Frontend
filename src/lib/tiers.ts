import type { LeaderboardTier, RankedRole } from "./types";

export const RANKED_ROLES: RankedRole[] = ["CONTRIBUTOR", "LEXICAL_EDITOR", "CHIEF_LEXICAL_EDITOR"];

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
  validatedEntries: number;
  tier: LeaderboardTier;
  toNextTier: number | null;
  nextTier: LeaderboardTier | null;
}

export interface LeaderboardConfig {
  rewardPointPerEntry: number;
  tierGoldMin: number;
  tierSilverMin: number;
  tierBronzeMin: number;
}

export interface LeaderboardResponse {
  role: RankedRole;
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
  config: LeaderboardConfig;
}
