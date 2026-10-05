/* ------------------------------------------------------------------ */
/* Lexical data model (UKC LMF schema, per SRS §2)                     */
/* ------------------------------------------------------------------ */

export type POS = "n" | "v" | "a" | "r";

export type SenseRelType = "derivation" | "antonym" | "metonym";
export type SynsetRelType =
  | "hypernym"
  | "mero_part"
  | "mero_substance"
  | "mero_member"
  | "attribute";

export interface SenseRelation {
  relType: SenseRelType;
  target: string; // ben-sen{integer}
}

export interface SynsetRelation {
  relType: SynsetRelType;
  target: string; // ben-syn{integer}
}

/* ------------------------------------------------------------------ */
/* Roles and access control (SRS §3)                                   */
/* ------------------------------------------------------------------ */

export type Role =
  | "PLATFORM_ARCHITECT"
  | "SYSTEM_MODERATOR"
  | "CONTRIBUTOR"
  | "LEXICAL_EDITOR"
  | "CHIEF_LEXICAL_EDITOR"
  | "ARBITRATION_CURATOR";

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  email: string;
  active: boolean;
  suspended: boolean;
  joinedAt: string; // ISO date
  /** Community Board: opt-out of milestone auto-announcements (SRS §14.2). */
  autoAnnounce: boolean;
  /* Author information, filled by the Platform Architect at account
     creation and shown on the author profile. */
  dob: string; // ISO date
  institution: string;
  occupation: string;
}

export interface Session {
  userId: string;
  username: string;
  name: string;
  role: Role;
  /** Set when the one-time password has not been replaced yet (SRS §3.2). */
  mustChangePassword?: boolean;
  /** ISO timestamp when the access token / session expires (backend). */
  expiresAt?: string;
  expiresInSeconds?: number;
  sessionTimeoutMinutes?: number;
}

/* ------------------------------------------------------------------ */
/* Entry lifecycle (SRS §5)                                            */
/* ------------------------------------------------------------------ */

export type EntryState =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "FLAGGED"
  | "C_FLAGGED"
  | "EDITOR_APPROVED"
  | "ARBITRATION"
  | "VALIDATED"
  | "REJECTED";

export interface StateTransition {
  from: EntryState | null;
  to: EntryState;
  actorId: string;
  actorRole: Role | "SYSTEM";
  timestamp: string;
  comment?: string;
}

/** A crowdsourced submission moving through the validation pipeline. */
export interface Submission {
  id: string; // sub-{n}
  state: EntryState;
  contributorId: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string; // reviewer user id
  /* proposed lexical payload (Quick Input form, SRS §6.2) */
  writtenForm: string;
  pos: POS;
  synsetAction: "link" | "create";
  synsetId?: string; // when linking to existing synset
  iliCode?: string; // when creating a new synset
  definitionLanguage?: "ben" | "eng";
  definitionText?: string;
  senseRelations: SenseRelation[];
  synsetRelations: SynsetRelation[];
  reviewerNote?: string; // contributor's note for reviewers
  /* review trail */
  history: StateTransition[];
  editorComment?: string; // latest FLAG comment
  cleComment?: string; // latest C_FLAG note
  rejectionReason?: string;
  validatedBy?: string;
  validatedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Configuration (SRS §3.2, §4, §5.3)                                  */
/* ------------------------------------------------------------------ */

export interface SystemConfig {
  maxEntriesPerSession: number;
  maxEntriesPerDay: number;
  suspensionThreshold: number;
  minSubmissionSeconds: number;
  anomalyThresholdPerHour: number;
  ipRequestsPerMinute: number;
  sessionTimeoutMinutes: number;
  captchaEnabled: boolean;
  honeypotEnabled: boolean;
  captchaScoreThreshold: number;
  /* credential / password policy (SRS §3.2) */
  passwordMinLength: number;
  /* Leader Board (SRS §7.8) */
  rewardPointPerEntry: number;
  tierGoldMin: number;
  tierSilverMin: number;
  tierBronzeMin: number;
}

/* ------------------------------------------------------------------ */
/* Leader Board (SRS §7.8)                                             */
/* ------------------------------------------------------------------ */

/** Roles that earn reward points and are ranked on a leaderboard. */
export type RankedRole =
  | "CONTRIBUTOR"
  | "LEXICAL_EDITOR"
  | "CHIEF_LEXICAL_EDITOR";

export type LeaderboardTier = "GOLD" | "SILVER" | "BRONZE" | "PROVISIONAL";

/* ------------------------------------------------------------------ */
/* Author Community Board (SRS §14)                                    */
/* ------------------------------------------------------------------ */

export type ReactionType = "LIKE" | "UNLIKE" | "CELEBRATE";
