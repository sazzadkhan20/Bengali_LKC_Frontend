import "server-only";
import { activeCurators, store, userById } from "./store";
import type { ArbitrationCase, EntryState, Submission } from "./types";

export function countsByState(): Record<EntryState, number> {
  const counts = {
    DRAFT: 0,
    PENDING_REVIEW: 0,
    UNDER_REVIEW: 0,
    FLAGGED: 0,
    C_FLAGGED: 0,
    EDITOR_APPROVED: 0,
    ARBITRATION: 0,
    VALIDATED: 0,
    REJECTED: 0,
  } satisfies Record<EntryState, number>;
  for (const s of store.submissions) counts[s.state] += 1;
  return counts;
}

/** Entries submitted per week for the last `weeks` weeks. */
export function weeklySubmissionSeries(
  weeks: number,
  filter?: (s: Submission) => boolean
): { label: string; value: number }[] {
  const WEEK = 7 * 24 * 3600 * 1000;
  const nowMs = Date.now();
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    label: i === weeks - 1 ? "this wk" : `-${weeks - 1 - i}w`,
    value: 0,
  }));
  for (const s of store.submissions) {
    if (filter && !filter(s)) continue;
    const age = nowMs - new Date(s.createdAt).getTime();
    const idx = weeks - 1 - Math.floor(age / WEEK);
    if (idx >= 0 && idx < weeks) buckets[idx].value += 1;
  }
  return buckets;
}

export function topContributors(): {
  userId: string;
  name: string;
  submitted: number;
  validated: number;
}[] {
  const byUser = new Map<string, { submitted: number; validated: number }>();
  for (const s of store.submissions) {
    const rec = byUser.get(s.contributorId) ?? { submitted: 0, validated: 0 };
    rec.submitted += 1;
    if (s.state === "VALIDATED") rec.validated += 1;
    byUser.set(s.contributorId, rec);
  }
  return [...byUser.entries()]
    .map(([userId, rec]) => ({
      userId,
      name: userById(userId)?.name ?? userId,
      ...rec,
    }))
    .sort((a, b) => b.validated - a.validated || b.submitted - a.submitted)
    .slice(0, 10);
}

export function queueAgeBuckets(state: EntryState): {
  label: string;
  value: number;
}[] {
  const DAY = 24 * 3600 * 1000;
  const buckets = [
    { label: "0–1 day", value: 0 },
    { label: "1–3 days", value: 0 },
    { label: "3–7 days", value: 0 },
    { label: "> 7 days", value: 0 },
  ];
  for (const s of store.submissions) {
    if (s.state !== state) continue;
    const days = (Date.now() - new Date(s.updatedAt).getTime()) / DAY;
    if (days <= 1) buckets[0].value += 1;
    else if (days <= 3) buckets[1].value += 1;
    else if (days <= 7) buckets[2].value += 1;
    else buckets[3].value += 1;
  }
  return buckets;
}

export function recentAudit(n: number, filterTypes?: string[]) {
  const list = filterTypes
    ? store.audit.filter((a) => filterTypes.includes(a.targetType))
    : store.audit;
  return [...list]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, n);
}

export function quorumInfo(c: ArbitrationCase): {
  eligible: number;
  needed: number;
  cast: number;
  approve: number;
  reject: number;
} {
  const eligible = activeCurators().filter(
    (u) => !c.excludedCuratorIds.includes(u.id)
  ).length;
  const needed = Math.ceil((eligible * 2) / 3);
  const approve = c.votes.filter((v) => v.verdict !== "REJECT").length;
  const reject = c.votes.filter((v) => v.verdict === "REJECT").length;
  return { eligible, needed, cast: c.votes.length, approve, reject };
}

export function submissionsFor(
  filter: (s: Submission) => boolean
): Submission[] {
  return store.submissions
    .filter(filter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
