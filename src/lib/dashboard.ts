import "server-only";
import { backendAuthedFetch } from "@/lib/backend-auth";
import type { CaseOrigin, CaseStage, CaseStatus, VerdictBy } from "@/lib/arbitration";
import type { ChartDatum } from "@/components/charts";
import type { EntryState, POS, Role } from "@/lib/types";

export type StateCounts = Record<EntryState, number>;

export type DashSubmission = {
  id: string;
  writtenForm: string;
  pos: POS;
  state: EntryState;
  contributorId: string;
  contributorName: string | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Case summary; tallies are counts only, so verdicts stay hidden while voting is open. */
export type DashCase = {
  id: string;
  submissionId: string;
  writtenForm: string;
  pos: POS;
  status: CaseStatus;
  origin: CaseOrigin;
  stage: CaseStage;
  openedAt: string;
  responseDeadline: string | null;
  votingDeadline: string | null;
  resolvedAt: string | null;
  verdictBy: VerdictBy | null;
  finalVerdict: string | null;
  resultingState: EntryState | null;
  correctionNote: string | null;
  contributorId: string | null;
  contributorName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  hasContributorNote: boolean;
  hasReviewerNote: boolean;
  votesCast: number;
  eligible: number;
  quorum: number;
  votedByMe?: boolean;
};

export type ActivityEvent = {
  id: string;
  at: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: Role | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
};

export type Decision = {
  submissionId: string;
  writtenForm: string;
  fromState: EntryState;
  toState: EntryState;
  at: string;
};

export type QueueSummary = {
  available: number;
  assignedToMe: number;
  averageAgeHours: number;
  oldestAt: string | null;
};

export type Quota = {
  dayUsed: number;
  dayLimit: number;
  sessionUsed: number;
  sessionLimit: number;
  sessionStartedAt: string | null;
  /** Attempts rejected by the session or daily limit in the last 24 hours. */
  blocked: number;
  /** Accepted entries plus blocked attempts in the last 24 hours. */
  attempts: number;
  suspensionThreshold: number;
  lastHour: number;
  anomalyThresholdPerHour: number;
};

export type AnomalyAccount = {
  userId: string;
  name: string;
  role: string;
  suspended: boolean;
  lastHour: number;
  active: boolean;
  held: number;
  alerts: number;
  lastAlertAt: string | null;
};

export type AutoSuspension = {
  userId: string;
  name: string;
  stillSuspended: boolean;
  at: string;
  detail: string | null;
};

export type ArchitectData = {
  counts: StateCounts;
  totalSubmissions: number;
  users: { suspended: number; inactive: number; total: number; pendingFirstLogin: number; signedIn: number };
  stuckUnderReview: number;
  lexicon: { entries: number; crowdsourcedEntries: number; synsets: number; senses: number };
  lastExport: { id: string; at: string; entryCount: number; actorName: string | null } | null;
  topContributors: { userId: string; name: string; submitted: number; validated: number }[];
  recentActivity: ActivityEvent[];
};

export type ModeratorData = {
  counts: StateCounts;
  underReviewOld: number;
  openCases: DashCase[];
  ties: DashCase[];
  pendingCorrections: DashCase[];
  weekly: ChartDatum[];
  recentActivity: ActivityEvent[];
  anomalyThresholdPerHour: number;
  anomalies: AnomalyAccount[];
  autoSuspensions: AutoSuspension[];
};

export type EditorData = {
  queue: QueueSummary;
  ageBuckets: ChartDatum[];
  thisWeek: Record<"EDITOR_APPROVED" | "FLAGGED" | "REJECTED" | "ARBITRATION", number>;
  recentDecisions: Decision[];
  resubmitted: DashSubmission[];
  myCases: DashCase[];
};

export type ChiefData = {
  queue: QueueSummary;
  thisWeek: Record<"VALIDATED" | "C_FLAGGED" | "ARBITRATION", number>;
  validatedWeekly: ChartDatum[];
  recentDecisions: Decision[];
  myCases: DashCase[];
  queueItems: DashSubmission[];
};

export type ContributorData = {
  counts: StateCounts;
  attention: DashSubmission[];
  recent: DashSubmission[];
  myCases: DashCase[];
  weekly: ChartDatum[];
  quota: Quota;
};

export type CuratorData = {
  activeCount: number;
  votedCount: number;
  awaitingCount: number;
  active: DashCase[];
  responseWindow: DashCase[];
  ties: DashCase[];
  resolved: DashCase[];
  myVotes: { contributor: number; reviewer: number };
  panel: { eligible: number; quorum: number };
};

export async function fetchDashboard<T>(): Promise<T | null> {
  const res = await backendAuthedFetch<T>("/api/dashboard/me", { cache: "no-store" });
  return res.ok ? (res.data as T) : null;
}

export async function fetchQuota(): Promise<Quota | null> {
  const res = await backendAuthedFetch<Quota>("/api/dashboard/quota", { cache: "no-store" });
  return res.ok ? res.data : null;
}
