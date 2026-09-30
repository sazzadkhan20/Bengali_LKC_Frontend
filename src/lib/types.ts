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

export interface Sense {
  id: string; // ben-sen{integer}
  synset: string; // ben-syn{integer}
  relations?: SenseRelation[];
}

export interface LexicalEntry {
  id: string; // ben-word-{pos}{integer}
  lemma: string;
  pos: POS;
  senses: Sense[];
}

export interface SynsetDefinition {
  language: "ben" | "eng";
  text: string;
}

export interface Synset {
  id: string; // ben-syn{integer}
  ili: string; // {offset}-{pos}
  pos: POS;
  lexicalized: boolean;
  definition?: SynsetDefinition;
  relations?: SynsetRelation[];
}

export interface LexiconMeta {
  id: string;
  label: string;
  language: string;
  email: string;
  license: string;
  version: string;
  source: string;
  description: string;
  publisher: string;
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

/**
 * Login credential issued by the Platform Architect (SRS §3.2).
 * The initial password is one-time: it must be changed at first login.
 * In production the password is stored as a salted hash (bcrypt/Argon2id);
 * this demo store keeps it in plain text for demonstration only.
 */
export interface Credential {
  id: string;
  userId: string;
  username: string;
  password: string;
  /** True while the system-generated one-time password is still in force. */
  oneTime: boolean;
  issuedBy: string;
  issuedAt: string;
  lastChangedAt?: string;
  deactivated: boolean;
  /** Pending password-change OTP (2-step validation via registered email). */
  pendingOtp?: {
    code: string;
    expiresAt: string; // ISO timestamp
  };
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
/* Arbitration (SRS §7.6)                                              */
/* ------------------------------------------------------------------ */

export type ArbitrationStatus =
  | "RESPONSE_WINDOW"
  | "ACTIVE"
  | "TIE_PENDING"
  | "RESOLVED";

export type ArbitrationVerdictOption =
  | "APPROVE_CLAIMANT"
  | "APPROVE_ACCUSED"
  | "REJECT";

export interface ArbitrationVote {
  curatorId: string;
  verdict: ArbitrationVerdictOption;
  rationale: string;
  correctionNote?: string;
  votedAt: string;
}

export interface ArbitrationCase {
  id: string; // case-{n}
  submissionId: string;
  claimantId: string;
  accusedId: string;
  disputeType: "DISPUTE_REJECTION" | "DISPUTE_FLAG" | "ESCALATION";
  disputeNote: string;
  counterClaim?: string;
  openedAt: string;
  responseDeadline: string;
  status: ArbitrationStatus;
  votes: ArbitrationVote[];
  excludedCuratorIds: string[]; // conflict-of-interest rule
  finalVerdict?: ArbitrationVerdictOption;
  verdictBy?: "PANEL" | "TIE_BREAK";
  tieBrokenBy?: string;
  resolvedAt?: string;
  correctionApplied?: boolean;
  correctionNote?: string;
}

/* ------------------------------------------------------------------ */
/* Audit + configuration (SRS §3.2, §4, §5.3)                          */
/* ------------------------------------------------------------------ */

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: Role | "SYSTEM";
  action: string;
  targetType:
    | "SUBMISSION"
    | "USER"
    | "CREDENTIAL"
    | "EXPORT"
    | "CONFIG"
    | "ARBITRATION"
    | "COMMUNITY"
    | "AUTH";
  targetId?: string;
  detail?: string;
}

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

export interface PostReaction {
  userId: string;
  type: ReactionType;
}

export interface PostReply {
  id: string;
  authorId: string;
  text: string; // max 200 characters
  createdAt: string;
}

export interface PostReport {
  reporterId: string;
  reason?: string;
  reportedAt: string;
}

export interface CommunityPost {
  id: string; // post-{n}
  authorId: string;
  /** True when the system posted on the author's behalf (milestone / tier). */
  auto: boolean;
  text: string; // max 500 characters
  createdAt: string;
  reactions: PostReaction[];
  replies: PostReply[]; // single flat level
  reports: PostReport[];
  /** Hidden by a System Moderator after report review (SRS §14.5). */
  hidden: boolean;
}

export interface ExportRecord {
  id: string;
  timestamp: string;
  actorId: string;
  entryCount: number;
  synsetCount: number;
  sha256: string;
  config: string;
}

/** Interest form from visitors who want to join Ben-LKC (Apply to Contribute). */
export interface ContributeApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  institution?: string;
  interestRole?: string;
  message: string;
  createdAt: string;
  status: "NEW" | "REVIEWED";
}
