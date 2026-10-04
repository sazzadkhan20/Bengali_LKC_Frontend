import "server-only";
import { backendAuthedFetch } from "@/lib/backend-auth";
import type { FeedPage } from "@/components/dashboard/Community";
import type { LeaderboardRow } from "@/lib/tiers";
import type { Role } from "@/lib/types";

export interface AuthorProfile {
  id: string;
  name: string;
  username: string;
  role: Role;
  joinedAt: string | null;
  institution: string | null;
  occupation: string | null;
  suspended: boolean;
  active: boolean;
  isSelf: boolean;
  email?: string | null;
  dob?: string | null;
  autoAnnounce?: boolean;
  postCount: number;
  replyCount: number;
  standing: LeaderboardRow | null;
}

export async function fetchFeed(params: { view?: string; authorId?: string; size?: number }): Promise<FeedPage | null> {
  const qs = new URLSearchParams();
  if (params.view) qs.set("view", params.view);
  if (params.authorId) qs.set("authorId", params.authorId);
  if (params.size) qs.set("size", String(params.size));
  const res = await backendAuthedFetch<FeedPage>(`/api/community${qs.size ? `?${qs}` : ""}`, { cache: "no-store" });
  return res.ok ? res.data : null;
}

/** `undefined` when the author does not exist; `null` when the service is unavailable. */
export async function fetchProfile(userId: string): Promise<AuthorProfile | null | undefined> {
  const res = await backendAuthedFetch<AuthorProfile>(`/api/community/profile/${encodeURIComponent(userId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return undefined;
  return res.ok ? res.data : null;
}
