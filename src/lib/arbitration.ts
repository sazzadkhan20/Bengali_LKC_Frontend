import type { EntryState, POS, Role } from "./types";

export type CaseStatus = "RESPONSE_WINDOW" | "ACTIVE" | "TIE_PENDING" | "RESOLVED";
export type CaseOrigin = "CONTRIBUTOR_DISPUTE" | "REVIEWER_ESCALATION" | "EMERGENCY_OVERRIDE";
export type CaseStage = "EDITOR" | "CHIEF";
export type CaseSide = "CONTRIBUTOR" | "REVIEWER";
export type CasePhase = "OPEN" | CaseStatus | "ALL";
export type VerdictBy = "PANEL" | "TIE_BREAK" | "EMERGENCY_OVERRIDE" | "NO_RESPONSE" | "LAPSED";

export type PartyRef = { id: string; name: string | null; role: Role | null };

export type ScheduleInfo = {
  checkTime: string;
  timeZone: string;
  nextCheckAt: string;
  responseWindowHours: number;
  votingRoundDays: number;
};

export type CaseRow = {
  id: string;
  submissionId: string;
  status: CaseStatus;
  origin: CaseOrigin;
  stage: CaseStage;
  writtenForm: string;
  pos: POS;
  definition: string | null;
  entryState: EntryState;
  contributor: PartyRef;
  reviewer: PartyRef | null;
  contributorNoteAt: string | null;
  reviewerNoteAt: string | null;
  openedAt: string;
  responseDeadline: string;
  windowClosesAt: string;
  windowClosedAt: string | null;
  votingOpenedAt: string | null;
  votingDeadline: string | null;
  votingClosesAt: string | null;
  votingRound: number;
  votesCast: number;
  votedByMe: boolean;
  resolvedAt: string | null;
  finalVerdict: string | null;
  verdictBy: VerdictBy | null;
  resultingState: EntryState | null;
  viewerSide: CaseSide | null;
  awaitingMyNote: boolean;
};

export type CaseListResponse = {
  items: CaseRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  phase: CasePhase;
  q: string | null;
  counts: Record<CasePhase, number>;
  scope: "ALL" | "CONTRIBUTOR" | "REVIEWER";
  panel: { eligible: number; quorum: number };
  schedule: ScheduleInfo;
};

export type CaseVote = {
  curator: PartyRef;
  verdict: CaseSide;
  rationale: string;
  votedAt: string;
};

export type CaseDetail = {
  id: string;
  status: CaseStatus;
  origin: CaseOrigin;
  stage: CaseStage;
  preArbitrationState: EntryState | null;
  openedAt: string;
  openedBy: PartyRef;
  openingNote: string | null;
  submission: {
    id: string;
    writtenForm: string;
    pos: POS;
    state: EntryState;
    synsetAction: "link" | "create" | null;
    synsetId: string | null;
    definition: string | null;
    ili: string | null;
    createdAt: string | null;
  };
  contributor: PartyRef & { note: string | null; noteAt: string | null };
  reviewer: (PartyRef & { note: string | null; noteAt: string | null }) | null;
  responseWindow: { deadline: string; closesAt: string; closedAt: string | null };
  voting: {
    openedAt: string;
    deadline: string | null;
    closesAt: string | null;
    round: number;
    extensions: number;
    eligible: number;
    quorum: number;
    cast: number;
    closed: boolean;
    contributorVotes?: number;
    reviewerVotes?: number;
    votes?: CaseVote[];
    myVote?: { verdict: CaseSide; rationale: string; votedAt: string };
  } | null;
  outcome: {
    verdict: string | null;
    verdictBy: VerdictBy | null;
    resolvedAt: string | null;
    resultingState: EntryState | null;
    note: string | null;
    resolvedBy: PartyRef | null;
  } | null;
  viewer: {
    side: CaseSide | null;
    isCurator: boolean;
    isManager: boolean;
    canEditNote: boolean;
    canVote: boolean;
    voteBlockedReason: string | null;
    canResolveTie: boolean;
  };
  rules: { noteMin: number; noteMax: number; rationaleMin: number; rationaleMax: number };
  schedule: ScheduleInfo;
};

export const PHASE_LABEL: Record<CasePhase, string> = {
  OPEN: "All open cases",
  RESPONSE_WINDOW: "Response window",
  ACTIVE: "Active for voting",
  TIE_PENDING: "Tied — awaiting decision",
  RESOLVED: "Resolved",
  ALL: "All cases",
};

export const STATUS_LABEL: Record<CaseStatus, string> = {
  RESPONSE_WINDOW: "Response window",
  ACTIVE: "Voting open",
  TIE_PENDING: "Tied",
  RESOLVED: "Resolved",
};

export const STATUS_STYLE: Record<CaseStatus, string> = {
  RESPONSE_WINDOW: "bg-sky-50 text-sky-700 ring-sky-200",
  ACTIVE: "bg-violet-50 text-violet-700 ring-violet-200",
  TIE_PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  RESOLVED: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const ORIGIN_LABEL: Record<CaseOrigin, string> = {
  CONTRIBUTOR_DISPUTE: "Contributor dispute",
  REVIEWER_ESCALATION: "Reviewer escalation",
  EMERGENCY_OVERRIDE: "Emergency override",
};

export const ORIGIN_HINT: Record<CaseOrigin, string> = {
  CONTRIBUTOR_DISPUTE: "The contributor disputed the reviewer's decision; the reviewer has 72 hours to respond.",
  REVIEWER_ESCALATION: "The reviewer escalated the entry; the contributor has 72 hours to respond.",
  EMERGENCY_OVERRIDE: "A manager moved the entry into arbitration; both sides have 72 hours to submit a note.",
};

export function reviewerTitle(stage: CaseStage): string {
  return stage === "CHIEF" ? "Chief Lexical Editor" : "Lexical Editor";
}

/** Human-readable outcome, e.g. "Contributor upheld by the panel". */
export function outcomeLabel(
  status: CaseStatus,
  verdict: string | null,
  verdictBy: VerdictBy | null,
  stage: CaseStage
): string {
  if (status === "TIE_PENDING") return "Panel tied";
  if (verdictBy === "TIE_BREAK") return "Tie resolved by the System Moderator";
  if (verdictBy === "EMERGENCY_OVERRIDE") return "Closed by emergency override";
  if (verdictBy === "LAPSED") return "Lapsed — no notes submitted";
  const side =
    verdict === "CONTRIBUTOR"
      ? "Contributor upheld"
      : verdict === "REVIEWER"
        ? `${reviewerTitle(stage)} upheld`
        : "Resolved";
  if (verdictBy === "PANEL") return `${side} by the panel`;
  if (verdictBy === "NO_RESPONSE") return `${side} — other side did not respond`;
  return side;
}

/** Deadlines are shown in the platform's arbitration time zone so every party reads the same time. */
export function formatDhaka(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compact countdown such as "2d 4h left" or "closing at the next check". */
export function countdown(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "due at the next daily check";
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  if (h > 0) return `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m left`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
}
