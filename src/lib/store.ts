/**
 * In-memory mock workflow store.
 *
 * This simulates the platform database for demonstration purposes:
 * users, login credentials, crowdsourced submissions moving through the
 * validation pipeline (SRS §5), arbitration cases (SRS §7.6), the Author
 * Community Board (SRS §14), the audit trail (SRS §5.3) and system
 * configuration (SRS §4).
 *
 * It is deliberately kept behind a small API surface so it can later be
 * swapped for a real database (e.g. PostgreSQL + Prisma) without
 * touching the UI.
 */
import type {
  ArbitrationCase,
  AuditEvent,
  CommunityPost,
  Credential,
  EntryState,
  ExportRecord,
  LeaderboardTier,
  RankedRole,
  Role,
  Submission,
  SystemConfig,
  User,
} from "./types";

/* ------------------------------------------------------------------ */
/* Seed users (one per role plus extra contributors/curators)          */
/* ------------------------------------------------------------------ */

const SEED_USERS: User[] = [
  { id: "u-arch", username: "architect", name: "Dr. Anisur Rahman", role: "PLATFORM_ARCHITECT", email: "architect@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-01-05", autoAnnounce: true, dob: "1975-03-14", institution: "University of Dhaka", occupation: "University Teacher" },
  { id: "u-mod", username: "moderator", name: "Farhana Akter", role: "SYSTEM_MODERATOR", email: "moderator@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-01-10", autoAnnounce: true, dob: "1984-11-02", institution: "Bangla Academy", occupation: "Research Officer" },
  { id: "u-con1", username: "contributor", name: "Saiful Islam", role: "CONTRIBUTOR", email: "saiful@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-02-01", autoAnnounce: true, dob: "1996-07-21", institution: "Jahangirnagar University", occupation: "Graduate Student" },
  { id: "u-con2", username: "mita.c", name: "Mita Chakraborty", role: "CONTRIBUTOR", email: "mita@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-02-12", autoAnnounce: true, dob: "1992-01-30", institution: "Rajshahi College", occupation: "College Teacher" },
  { id: "u-con3", username: "rafi.c", name: "Rafiul Hasan", role: "CONTRIBUTOR", email: "rafi@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-03-02", autoAnnounce: true, dob: "1999-09-05", institution: "BUET", occupation: "Software Engineer" },
  { id: "u-con4", username: "nusrat.c", name: "Nusrat Jahan", role: "CONTRIBUTOR", email: "nusrat@lkc.ac.bd", active: true, suspended: true, joinedAt: "2026-03-20", autoAnnounce: true, dob: "1998-05-17", institution: "Chittagong University", occupation: "Student" },
  { id: "u-le1", username: "editor", name: "Prof. Kamal Uddin", role: "LEXICAL_EDITOR", email: "editor@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-01-15", autoAnnounce: true, dob: "1968-12-09", institution: "University of Dhaka", occupation: "University Teacher" },
  { id: "u-le2", username: "shilpi.e", name: "Shilpi Banerjee", role: "LEXICAL_EDITOR", email: "shilpi@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-02-05", autoAnnounce: true, dob: "1980-04-25", institution: "Jadavpur University", occupation: "Linguist" },
  { id: "u-cle", username: "chief", name: "Prof. Rokeya Sultana", role: "CHIEF_LEXICAL_EDITOR", email: "chief@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-01-15", autoAnnounce: true, dob: "1963-08-19", institution: "Bangla Academy", occupation: "Lexicographer" },
  { id: "u-ac1", username: "curator", name: "Dr. Tanvir Ahmed", role: "ARBITRATION_CURATOR", email: "tanvir@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-01-20", autoAnnounce: true, dob: "1972-02-11", institution: "Rajshahi University", occupation: "University Teacher" },
  { id: "u-ac2", username: "lipi.a", name: "Dr. Lipi Ghosh", role: "ARBITRATION_CURATOR", email: "lipi@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-01-20", autoAnnounce: true, dob: "1976-10-03", institution: "University of Calcutta", occupation: "Researcher" },
  { id: "u-ac3", username: "joy.a", name: "Dr. Joydeep Sen", role: "ARBITRATION_CURATOR", email: "joy@lkc.ac.bd", active: true, suspended: false, joinedAt: "2026-02-15", autoAnnounce: true, dob: "1979-06-28", institution: "Visva-Bharati University", occupation: "University Teacher" },
];

/**
 * Demo login credentials (SRS §3.2). Issued by the Platform Architect and
 * emailed to the user; the one-time password must be changed at first login.
 * In production only a salted hash is stored (bcrypt/Argon2id).
 */
const SEED_CREDENTIALS: Credential[] = [
  { id: "cred-1", userId: "u-arch", username: "architect", password: "architect2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-01-05T08:00:00Z", lastChangedAt: "2026-01-05T09:00:00Z", deactivated: false },
  { id: "cred-2", userId: "u-mod", username: "moderator", password: "moderator2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-01-10T08:00:00Z", lastChangedAt: "2026-01-10T08:30:00Z", deactivated: false },
  { id: "cred-3", userId: "u-con1", username: "contributor", password: "contributor2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-02-01T08:00:00Z", lastChangedAt: "2026-02-01T10:00:00Z", deactivated: false },
  { id: "cred-4", userId: "u-le1", username: "editor", password: "editor2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-01-15T08:00:00Z", lastChangedAt: "2026-01-15T08:45:00Z", deactivated: false },
  { id: "cred-5", userId: "u-cle", username: "chief", password: "chief2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-01-15T08:00:00Z", lastChangedAt: "2026-01-15T09:10:00Z", deactivated: false },
  { id: "cred-6", userId: "u-ac1", username: "curator", password: "curator2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-01-20T08:00:00Z", lastChangedAt: "2026-01-20T08:20:00Z", deactivated: false },
  { id: "cred-7", userId: "u-con2", username: "mita.c", password: "welcome-mita-2026", oneTime: true, issuedBy: "u-arch", issuedAt: "2026-02-12T08:00:00Z", deactivated: false },
  { id: "cred-8", userId: "u-con3", username: "rafi.c", password: "rafi2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-03-02T08:00:00Z", lastChangedAt: "2026-03-02T11:00:00Z", deactivated: false },
  { id: "cred-9", userId: "u-con4", username: "nusrat.c", password: "nusrat2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-03-20T08:00:00Z", lastChangedAt: "2026-03-20T09:00:00Z", deactivated: true },
  { id: "cred-10", userId: "u-le2", username: "shilpi.e", password: "shilpi2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-02-05T08:00:00Z", lastChangedAt: "2026-02-05T08:40:00Z", deactivated: false },
  { id: "cred-11", userId: "u-ac2", username: "lipi.a", password: "lipi2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-01-20T08:00:00Z", lastChangedAt: "2026-01-20T08:50:00Z", deactivated: false },
  { id: "cred-12", userId: "u-ac3", username: "joy.a", password: "joy2026", oneTime: false, issuedBy: "u-arch", issuedAt: "2026-02-15T08:00:00Z", lastChangedAt: "2026-02-15T08:30:00Z", deactivated: false },
];

/* ------------------------------------------------------------------ */
/* Seed submissions across all lifecycle states                        */
/* ------------------------------------------------------------------ */

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (daysAgo: number, hourOffset = 0) =>
  new Date(now - daysAgo * DAY + hourOffset * 3600 * 1000).toISOString();

interface SeedSub {
  word: string;
  pos: Submission["pos"];
  state: EntryState;
  contributor: string;
  synsetId?: string;
  ili?: string;
  defLang?: "ben" | "eng";
  def?: string;
  daysAgo: number;
  editorComment?: string;
  cleComment?: string;
  rejectionReason?: string;
  assignedTo?: string;
  note?: string;
}

// Realistic Bengali words used as mock crowdsourced submissions.
const SEED_SUBS: SeedSub[] = [
  { word: "মুঠোফোন", pos: "n", state: "VALIDATED", contributor: "u-con1", synsetId: "ben-syn442836", defLang: "ben", def: "তারবিহীন বহনযোগ্য টেলিফোন যন্ত্র", daysAgo: 36 },
  { word: "অন্তর্জাল", pos: "n", state: "VALIDATED", contributor: "u-con2", ili: "06359193-n", defLang: "ben", def: "পরস্পর সংযুক্ত কম্পিউটার নেটওয়ার্কের বিশ্বব্যাপী ব্যবস্থা", daysAgo: 32 },
  { word: "ছায়াপথ", pos: "n", state: "VALIDATED", contributor: "u-con1", ili: "09239740-n", defLang: "ben", def: "নক্ষত্র, গ্যাস ও ধূলিকণার বিশাল সমষ্টি", daysAgo: 30 },
  { word: "সবুজায়ন", pos: "n", state: "VALIDATED", contributor: "u-con3", ili: "00252430-n", defLang: "ben", def: "কোনো অঞ্চলে গাছপালা রোপণের প্রক্রিয়া", daysAgo: 26 },
  { word: "নভোচারী", pos: "n", state: "VALIDATED", contributor: "u-con2", ili: "09818343-n", defLang: "ben", def: "মহাকাশযানে ভ্রমণকারী প্রশিক্ষিত ব্যক্তি", daysAgo: 24 },
  { word: "জলবায়ু পরিবর্তন", pos: "n", state: "VALIDATED", contributor: "u-con3", ili: "13455487-n", defLang: "ben", def: "দীর্ঘমেয়াদে আবহাওয়ার গড় অবস্থার পরিবর্তন", daysAgo: 21 },
  { word: "দূরশিক্ষণ", pos: "n", state: "EDITOR_APPROVED", contributor: "u-con1", ili: "00887702-n", defLang: "ben", def: "দূর থেকে প্রযুক্তির মাধ্যমে পরিচালিত শিক্ষা কার্যক্রম", daysAgo: 9, assignedTo: "u-cle" },
  { word: "সৌরপ্যানেল", pos: "n", state: "EDITOR_APPROVED", contributor: "u-con2", ili: "04257790-n", defLang: "ben", def: "সূর্যালোক থেকে বিদ্যুৎ উৎপাদনের যন্ত্র", daysAgo: 7, assignedTo: "u-cle" },
  { word: "নবায়নযোগ্য", pos: "a", state: "EDITOR_APPROVED", contributor: "u-con3", ili: "01130301-a", defLang: "ben", def: "যা পুনরায় ব্যবহার বা পূরণ করা যায়", daysAgo: 6 },
  { word: "যন্ত্রমানব", pos: "n", state: "PENDING_REVIEW", contributor: "u-con1", ili: "10535706-n", defLang: "ben", def: "স্বয়ংক্রিয়ভাবে কাজ সম্পাদনকারী যান্ত্রিক মানব", daysAgo: 5, assignedTo: "u-le1" },
  { word: "তথ্যভাণ্ডার", pos: "n", state: "PENDING_REVIEW", contributor: "u-con2", ili: "06637824-n", defLang: "ben", def: "সুসংগঠিতভাবে সংরক্ষিত তথ্যের সমাহার", daysAgo: 4, assignedTo: "u-le1" },
  { word: "সাইবার নিরাপত্তা", pos: "n", state: "PENDING_REVIEW", contributor: "u-con3", ili: "04565375-n", defLang: "ben", def: "কম্পিউটার ব্যবস্থা ও নেটওয়ার্ক রক্ষার প্রযুক্তি", daysAgo: 3 },
  { word: "ভেষজ", pos: "a", state: "PENDING_REVIEW", contributor: "u-con1", ili: "02865931-a", defLang: "ben", def: "উদ্ভিদ থেকে প্রাপ্ত ঔষধি গুণসম্পন্ন", daysAgo: 2 },
  { word: "নীলাভ", pos: "a", state: "PENDING_REVIEW", contributor: "u-con2", ili: "00379754-a", defLang: "ben", def: "নীল রঙের আভাযুক্ত", daysAgo: 1 },
  { word: "উড়োজাহাজ", pos: "n", state: "FLAGGED", contributor: "u-con1", ili: "02691156-n", defLang: "ben", def: "আকাশে চলাচলকারী যান", daysAgo: 8, editorComment: "সংজ্ঞাটি খুব সংক্ষিপ্ত — ডানাযুক্ত ও ইঞ্জিনচালিত বৈশিষ্ট্য উল্লেখ করুন। দয়া করে সম্প্রসারণ করে পুনরায় জমা দিন।" },
  { word: "হিমবাহ", pos: "n", state: "C_FLAGGED", contributor: "u-con2", ili: "09289331-n", defLang: "ben", def: "ধীরে চলমান বরফের নদী", daysAgo: 10, cleComment: "ভাষাগত সংশোধন প্রয়োজন: 'বরফের নদী' রূপক — বৈজ্ঞানিক সংজ্ঞা ব্যবহার করুন (সঞ্চিত তুষার হতে গঠিত চলমান বরফপুঞ্জ)।" },
  { word: "চলভাষ", pos: "n", state: "REJECTED", contributor: "u-con3", ili: "04401088-n", defLang: "ben", def: "মোবাইল ফোনের প্রতিশব্দ", daysAgo: 12, rejectionReason: "প্রস্তাবিত শব্দটি প্রামাণ্য অভিধানে অনুপস্থিত এবং ব্যবহারিক প্রচলনের প্রমাণ দেওয়া হয়নি। নির্ভরযোগ্য উৎসসহ পুনরায় জমা দিন।" },
  { word: "অণুজীব", pos: "n", state: "ARBITRATION", contributor: "u-con1", ili: "01328702-n", defLang: "ben", def: "খালি চোখে দেখা যায় না এমন আণুবীক্ষণিক জীব", daysAgo: 15 },
  { word: "প্রতিধ্বনি", pos: "n", state: "ARBITRATION", contributor: "u-con2", ili: "07371293-n", defLang: "ben", def: "শব্দতরঙ্গের প্রতিফলনে সৃষ্ট পুনরাবৃত্ত শব্দ", daysAgo: 18 },
  { word: "বায়ুকল", pos: "n", state: "UNDER_REVIEW", contributor: "u-con4", ili: "04587404-n", defLang: "ben", def: "বাতাসের শক্তিতে চালিত যন্ত্র", daysAgo: 2 },
  { word: "জোয়ারভাটা", pos: "n", state: "UNDER_REVIEW", contributor: "u-con4", ili: "07792470-n", defLang: "ben", def: "চাঁদের আকর্ষণে সমুদ্রের জল ওঠানামা", daysAgo: 2 },
  { word: "স্মারকলিপি", pos: "n", state: "DRAFT", contributor: "u-con1", ili: "06509210-n", defLang: "ben", def: "দাবি বা বক্তব্য লিখিতভাবে উপস্থাপনের পত্র", daysAgo: 0 },
  { word: "পুনর্ব্যবহার", pos: "n", state: "VALIDATED", contributor: "u-con2", ili: "00251013-n", defLang: "ben", def: "বর্জ্য পদার্থকে পুনরায় ব্যবহারোপযোগী করার প্রক্রিয়া", daysAgo: 19 },
  { word: "দ্রুতগামী", pos: "a", state: "VALIDATED", contributor: "u-con3", ili: "00976508-a", defLang: "ben", def: "অতি দ্রুত চলে এমন", daysAgo: 17 },
  { word: "আলোকবর্ষ", pos: "n", state: "VALIDATED", contributor: "u-con1", ili: "13661820-n", defLang: "ben", def: "আলো এক বছরে যে দূরত্ব অতিক্রম করে", daysAgo: 14 },
  { word: "সমুদ্রসৈকত", pos: "n", state: "VALIDATED", contributor: "u-con2", ili: "09217230-n", defLang: "ben", def: "সমুদ্রতীরের বালুকাময় ভূমি", daysAgo: 13 },
];

/* ------------------------------------------------------------------ */
/* Store construction                                                  */
/* ------------------------------------------------------------------ */

export interface StoreShape {
  users: User[];
  credentials: Credential[];
  submissions: Submission[];
  cases: ArbitrationCase[];
  posts: CommunityPost[];
  audit: AuditEvent[];
  exports: ExportRecord[];
  config: SystemConfig;
  counters: {
    submission: number;
    case: number;
    audit: number;
    user: number;
    credential: number;
    post: number;
    reply: number;
  };
}

function buildStore(): StoreShape {
  let auditSeq = 1;
  const audit: AuditEvent[] = [];
  const pushAudit = (
    e: Omit<AuditEvent, "id">
  ): AuditEvent => {
    const ev = { ...e, id: `aud-${auditSeq++}` };
    audit.push(ev);
    return ev;
  };

  const roleOf = (id: string): Role =>
    SEED_USERS.find((u) => u.id === id)?.role ?? "CONTRIBUTOR";

  const submissions: Submission[] = SEED_SUBS.map((s, i) => {
    const id = `sub-${i + 1}`;
    const created = iso(s.daysAgo);
    const history: Submission["history"] = [];
    const step = (
      from: EntryState | null,
      to: EntryState,
      actorId: string,
      hoursLater: number,
      comment?: string
    ) => {
      history.push({
        from,
        to,
        actorId,
        actorRole: actorId === "system" ? "SYSTEM" : roleOf(actorId),
        timestamp: iso(s.daysAgo, hoursLater),
        comment,
      });
      pushAudit({
        timestamp: iso(s.daysAgo, hoursLater),
        actorId,
        actorRole: actorId === "system" ? "SYSTEM" : roleOf(actorId),
        action: `STATE ${from ?? "NEW"} → ${to}`,
        targetType: "SUBMISSION",
        targetId: id,
        detail: `"${s.word}"${comment ? ` — ${comment.slice(0, 60)}` : ""}`,
      });
    };

    step(null, "DRAFT", s.contributor, 0);
    if (s.state !== "DRAFT") {
      if (s.state === "UNDER_REVIEW") {
        step("DRAFT", "PENDING_REVIEW", s.contributor, 1);
        step("PENDING_REVIEW", "UNDER_REVIEW", "system", 1, "Anti-bot: suspicious submission timing");
      } else {
        step("DRAFT", "PENDING_REVIEW", s.contributor, 1);
      }
    }
    if (["EDITOR_APPROVED", "C_FLAGGED", "VALIDATED"].includes(s.state)) {
      step("PENDING_REVIEW", "EDITOR_APPROVED", "u-le1", 24, "Structure and references verified.");
    }
    if (s.state === "C_FLAGGED") {
      step("EDITOR_APPROVED", "C_FLAGGED", "u-cle", 48, s.cleComment);
    }
    if (s.state === "FLAGGED") {
      step("PENDING_REVIEW", "FLAGGED", "u-le1", 24, s.editorComment);
    }
    if (s.state === "REJECTED") {
      step("PENDING_REVIEW", "REJECTED", "u-le1", 24, s.rejectionReason);
    }
    if (s.state === "VALIDATED") {
      step("EDITOR_APPROVED", "VALIDATED", "u-cle", 72, "Linguistically correct. Approved for export.");
    }
    if (s.state === "ARBITRATION") {
      step("PENDING_REVIEW", s.word === "অণুজীব" ? "REJECTED" : "FLAGGED", "u-le1", 24, "Initial decision disputed by contributor.");
      step(s.word === "অণুজীব" ? "REJECTED" : "FLAGGED", "ARBITRATION", s.contributor, 48, "Contributor dispute filed.");
    }

    return {
      id,
      state: s.state,
      contributorId: s.contributor,
      createdAt: created,
      updatedAt: history[history.length - 1]?.timestamp ?? created,
      assignedTo: s.assignedTo,
      writtenForm: s.word,
      pos: s.pos,
      synsetAction: s.synsetId ? "link" : "create",
      synsetId: s.synsetId,
      iliCode: s.ili,
      definitionLanguage: s.defLang,
      definitionText: s.def,
      senseRelations: [],
      synsetRelations: [],
      reviewerNote: s.note,
      history,
      editorComment: s.editorComment,
      cleComment: s.cleComment,
      rejectionReason: s.rejectionReason,
      validatedBy: s.state === "VALIDATED" ? "u-cle" : undefined,
      validatedAt: s.state === "VALIDATED" ? iso(s.daysAgo, 72) : undefined,
    } satisfies Submission;
  });

  const cases: ArbitrationCase[] = [
    {
      id: "case-1",
      submissionId: submissions.find((x) => x.writtenForm === "অণুজীব")!.id,
      claimantId: "u-con1",
      accusedId: "u-le1",
      disputeType: "DISPUTE_REJECTION",
      disputeNote:
        "শব্দটি মাধ্যমিক জীববিজ্ঞান পাঠ্যবইয়ে বহুল ব্যবহৃত। বাংলা একাডেমি অভিধানেও 'অণুজীব' ভুক্তি রয়েছে। প্রত্যাখ্যান অযৌক্তিক।",
      counterClaim:
        "প্রত্যাখ্যানের কারণ ছিল ILI সংযোগের অমিল; শব্দটি নিয়ে আপত্তি নেই। প্যানেলের সিদ্ধান্ত মেনে নেব।",
      openedAt: iso(13),
      responseDeadline: iso(10),
      status: "ACTIVE",
      votes: [
        { curatorId: "u-ac2", verdict: "APPROVE_CLAIMANT", rationale: "Authoritative dictionary attestation provided; ILI mapping verified against PWN 2.1 registry.", votedAt: iso(8) },
      ],
      excludedCuratorIds: [],
    },
    {
      id: "case-2",
      submissionId: submissions.find((x) => x.writtenForm === "প্রতিধ্বনি")!.id,
      claimantId: "u-con2",
      accusedId: "u-le1",
      disputeType: "DISPUTE_FLAG",
      disputeNote:
        "ফ্ল্যাগের মন্তব্যে কোন নির্দিষ্ট ত্রুটি উল্লেখ করা হয়নি। সংজ্ঞাটি পদার্থবিজ্ঞান পরিভাষা অনুসারে সঠিক।",
      openedAt: iso(2),
      responseDeadline: iso(-1), // still open (in the future)
      status: "RESPONSE_WINDOW",
      votes: [],
      excludedCuratorIds: [],
    },
  ];

  // a couple of non-submission audit events
  pushAudit({ timestamp: iso(3, 2), actorId: "u-arch", actorRole: "PLATFORM_ARCHITECT", action: "CREDENTIAL_ISSUED", targetType: "CREDENTIAL", targetId: "cred-7", detail: "One-time credential emailed to Mita Chakraborty — first-login password change pending" });
  pushAudit({ timestamp: iso(2, 1), actorId: "system", actorRole: "SYSTEM", action: "ACCOUNT_SUSPENDED", targetType: "USER", targetId: "u-con4", detail: "Rate limit exceeded: 512 entries in rolling window" });
  pushAudit({ timestamp: iso(2, 1.2), actorId: "u-arch", actorRole: "PLATFORM_ARCHITECT", action: "CREDENTIAL_DEACTIVATED", targetType: "CREDENTIAL", targetId: "cred-9", detail: "Credential frozen on suspension — all active sessions invalidated" });
  pushAudit({ timestamp: iso(1, 4), actorId: "u-mod", actorRole: "SYSTEM_MODERATOR", action: "EXPORT_GENERATED", targetType: "EXPORT", targetId: "exp-1", detail: "19,290 entries, SHA-256 logged" });

  /* ---------------- Author Community Board seed (SRS §14) ----------- */
  const posts: CommunityPost[] = [
    {
      id: "post-1",
      authorId: "u-con1",
      auto: false,
      text: "আজ 'ছায়াপথ' শব্দটি VALIDATED হলো! জ্যোতির্বিজ্ঞানের আরও বাংলা পরিভাষা যোগ করার পরিকল্পনা করছি। কেউ আগ্রহী থাকলে জানান।",
      createdAt: iso(6, 3),
      reactions: [
        { userId: "u-con2", type: "CELEBRATE" },
        { userId: "u-le1", type: "LIKE" },
        { userId: "u-cle", type: "CELEBRATE" },
      ],
      replies: [
        { id: "reply-1", authorId: "u-con2", text: "অভিনন্দন! আমি 'নীহারিকা' নিয়ে কাজ করছি — সমন্বয় করা যেতে পারে।", createdAt: iso(6, 5) },
        { id: "reply-2", authorId: "u-cle", text: "চমৎকার উদ্যোগ। ILI ম্যাপিংয়ে সাহায্য লাগলে জানাবেন।", createdAt: iso(5, 2) },
      ],
      reports: [],
      hidden: false,
    },
    {
      id: "post-2",
      authorId: "u-le1",
      auto: false,
      text: "Reviewers: please remember that FLAGGED comments must be at least 15 characters and should point to the specific issue. It saves everyone a resubmission cycle.",
      createdAt: iso(4, 6),
      reactions: [
        { userId: "u-mod", type: "LIKE" },
        { userId: "u-con3", type: "LIKE" },
      ],
      replies: [
        { id: "reply-3", authorId: "u-con3", text: "Agreed — specific comments make corrections much faster.", createdAt: iso(4, 9) },
      ],
      reports: [],
      hidden: false,
    },
    {
      id: "post-3",
      authorId: "u-con2",
      auto: true,
      text: "🏅 Milestone: Mita Chakraborty has reached 5 validated entries in the Bengali LKC. Congratulations!",
      createdAt: iso(3, 1),
      reactions: [
        { userId: "u-con1", type: "CELEBRATE" },
        { userId: "u-le2", type: "CELEBRATE" },
      ],
      replies: [],
      reports: [],
      hidden: false,
    },
    {
      id: "post-4",
      authorId: "u-con3",
      auto: false,
      text: "Buy cheap dictionaries at superdeals.example.com — best prices!!!",
      createdAt: iso(1, 2),
      reactions: [{ userId: "u-con1", type: "UNLIKE" }],
      replies: [],
      reports: [
        { reporterId: "u-le1", reason: "Spam / advertising — not related to the Bengali LKC.", reportedAt: iso(1, 4) },
      ],
      hidden: false,
    },
    {
      id: "post-5",
      authorId: "u-cle",
      auto: false,
      text: "সপ্তাহান্তে EDITOR_APPROVED সারিটি খালি করার চেষ্টা করব। ভাষাগত নোটসহ ফেরত পাঠানো ভুক্তিগুলো দ্রুত সংশোধন করে পুনরায় জমা দিলে ভালো হয়।",
      createdAt: iso(0, -4),
      reactions: [{ userId: "u-mod", type: "LIKE" }],
      replies: [],
      reports: [],
      hidden: false,
    },
  ];

  return {
    users: structuredClone(SEED_USERS),
    credentials: structuredClone(SEED_CREDENTIALS),
    submissions,
    cases,
    posts,
    audit,
    exports: [
      {
        id: "exp-1",
        timestamp: iso(1, 4),
        actorId: "u-mod",
        entryCount: 19290,
        synsetCount: 12480,
        sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        config: "All POS, full validated set, version 1.1-draft",
      },
    ],
    config: {
      maxEntriesPerSession: 50,
      maxEntriesPerDay: 200,
      suspensionThreshold: 500,
      minSubmissionSeconds: 10,
      anomalyThresholdPerHour: 100,
      ipRequestsPerMinute: 10,
      sessionTimeoutMinutes: 60,
      captchaEnabled: true,
      honeypotEnabled: true,
      captchaScoreThreshold: 0.5,
      passwordMinLength: 10,
      rewardPointPerEntry: 1,
      tierGoldMin: 500,
      tierSilverMin: 200,
      tierBronzeMin: 50,
    },
    counters: {
      submission: submissions.length + 1,
      case: cases.length + 1,
      audit: auditSeq,
      user: SEED_USERS.length + 1,
      credential: SEED_CREDENTIALS.length + 1,
      post: posts.length + 1,
      reply: 4,
    },
  };
}

/* Survive Next.js dev-mode HMR by stashing on globalThis. */
const g = globalThis as unknown as { __lkcStore?: StoreShape };
export const store: StoreShape = g.__lkcStore ?? (g.__lkcStore = buildStore());

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function userById(id: string): User | undefined {
  return store.users.find((u) => u.id === id);
}

export function credentialForUser(userId: string): Credential | undefined {
  return store.credentials.find((c) => c.userId === userId);
}

export function recordAudit(e: Omit<AuditEvent, "id" | "timestamp">): void {
  store.audit.push({
    ...e,
    id: `aud-${store.counters.audit++}`,
    timestamp: new Date().toISOString(),
  });
}

export function transitionSubmission(
  sub: Submission,
  to: EntryState,
  actorId: string,
  actorRole: Submission["history"][number]["actorRole"],
  comment?: string
): void {
  sub.history.push({
    from: sub.state,
    to,
    actorId,
    actorRole,
    timestamp: new Date().toISOString(),
    comment,
  });
  recordAudit({
    actorId,
    actorRole,
    action: `STATE ${sub.state} → ${to}`,
    targetType: "SUBMISSION",
    targetId: sub.id,
    detail: `"${sub.writtenForm}"${comment ? ` — ${comment.slice(0, 80)}` : ""}`,
  });
  sub.state = to;
  sub.updatedAt = new Date().toISOString();
  // Reward points are credited (and milestones announced) the moment an
  // entry becomes VALIDATED (SRS §7.8 / §14.2).
  if (to === "VALIDATED") announceValidationMilestones(sub);
}

/* ------------------------------------------------------------------ */
/* Leader Board — reward points (SRS §7.8)                             */
/* ------------------------------------------------------------------ */

export function tierForPoints(points: number): LeaderboardTier {
  const c = store.config;
  if (points >= c.tierGoldMin) return "GOLD";
  if (points >= c.tierSilverMin) return "SILVER";
  if (points >= c.tierBronzeMin) return "BRONZE";
  return "PROVISIONAL";
}

function validationTransition(sub: Submission) {
  return [...sub.history].reverse().find((h) => h.to === "VALIDATED");
}

/**
 * Derive the reward-point ledger from the submission histories.
 *
 * Point rules (SRS §7.8):
 * - A point is credited only when an entry reaches VALIDATED.
 * - Contributor: credited for their own entry, whether validated via the
 *   normal LE → CLE path or via an Arbitration panel verdict.
 * - Lexical Editor: credited only if the entry they set to EDITOR_APPROVED
 *   was validated by a CLE Final Approve (not via arbitration).
 * - Chief Lexical Editor: credited when their own Final Approve validated
 *   the entry.
 * - System Moderator Direct Approval / emergency overrides earn no points.
 * - Each role is credited at most once per entry.
 */
export function rewardPointsByRole(): Record<RankedRole, Map<string, number>> {
  const pv = store.config.rewardPointPerEntry;
  const board: Record<RankedRole, Map<string, number>> = {
    CONTRIBUTOR: new Map(),
    LEXICAL_EDITOR: new Map(),
    CHIEF_LEXICAL_EDITOR: new Map(),
  };
  const credit = (role: RankedRole, userId: string) => {
    if (userById(userId)?.role !== role) return;
    board[role].set(userId, (board[role].get(userId) ?? 0) + pv);
  };
  for (const sub of store.submissions) {
    if (sub.state !== "VALIDATED") continue;
    const v = validationTransition(sub);
    if (!v) continue;
    const viaCle = v.actorRole === "CHIEF_LEXICAL_EDITOR";
    const viaArbitration = v.actorRole === "SYSTEM";
    if (!viaCle && !viaArbitration) continue; // Direct Approval / override
    credit("CONTRIBUTOR", sub.contributorId);
    if (viaCle) {
      credit("CHIEF_LEXICAL_EDITOR", v.actorId);
      const le = [...sub.history]
        .reverse()
        .find((h) => h.to === "EDITOR_APPROVED");
      if (le) credit("LEXICAL_EDITOR", le.actorId);
    }
  }
  return board;
}

/* ------------------------------------------------------------------ */
/* Community Board — milestone auto-announcements (SRS §14.2)          */
/* ------------------------------------------------------------------ */

const VALIDATED_MILESTONES = [5, 10, 25, 50, 100, 250, 500];

const TIER_NAME: Record<LeaderboardTier, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
  PROVISIONAL: "Provisional",
};

function pushAutoPost(userId: string, text: string): void {
  store.posts.push({
    id: `post-${store.counters.post++}`,
    authorId: userId,
    auto: true,
    text,
    createdAt: new Date().toISOString(),
    reactions: [],
    replies: [],
    reports: [],
    hidden: false,
  });
  recordAudit({
    actorId: "system",
    actorRole: "SYSTEM",
    action: "AUTO_ANNOUNCEMENT",
    targetType: "COMMUNITY",
    detail: text.slice(0, 80),
  });
}

/** Post tier-change / milestone announcements for every credited role. */
function announceValidationMilestones(sub: Submission): void {
  const v = validationTransition(sub);
  if (!v) return;
  const viaCle = v.actorRole === "CHIEF_LEXICAL_EDITOR";
  const viaArbitration = v.actorRole === "SYSTEM";
  if (!viaCle && !viaArbitration) return; // no points, no announcements

  const board = rewardPointsByRole();
  const pv = store.config.rewardPointPerEntry;

  const announceTierChange = (role: RankedRole, userId: string) => {
    const user = userById(userId);
    if (!user || user.role !== role || !user.autoAnnounce) return;
    const points = board[role].get(userId) ?? 0;
    if (points <= 0) return;
    const before = tierForPoints(Math.max(points - pv, 0));
    const after = tierForPoints(points);
    if (after !== before) {
      pushAutoPost(
        userId,
        `🎖 Tier change: ${user.name} has advanced to the ${TIER_NAME[after]} tier on the ${role === "CONTRIBUTOR" ? "Contributor" : role === "LEXICAL_EDITOR" ? "Lexical Editor" : "Chief Lexical Editor"} leaderboard. Congratulations!`
      );
    }
  };

  // Contributor: validated-entry milestone + tier change
  const contributor = userById(sub.contributorId);
  if (contributor?.role === "CONTRIBUTOR" && contributor.autoAnnounce) {
    const validatedCount = store.submissions.filter(
      (s) => s.contributorId === contributor.id && s.state === "VALIDATED"
    ).length;
    if (VALIDATED_MILESTONES.includes(validatedCount)) {
      pushAutoPost(
        contributor.id,
        `🏅 Milestone: ${contributor.name} has reached ${validatedCount} validated entries in the Bengali LKC. Congratulations!`
      );
    }
  }
  announceTierChange("CONTRIBUTOR", sub.contributorId);
  if (viaCle) {
    announceTierChange("CHIEF_LEXICAL_EDITOR", v.actorId);
    const le = [...sub.history]
      .reverse()
      .find((h) => h.to === "EDITOR_APPROVED");
    if (le) announceTierChange("LEXICAL_EDITOR", le.actorId);
  }
}

export function activeCurators(): User[] {
  return store.users.filter(
    (u) => u.role === "ARBITRATION_CURATOR" && u.active && !u.suspended
  );
}

/** Evaluate quorum/majority after each vote (SRS §7.6.1). */
export function evaluateCase(c: ArbitrationCase): void {
  const eligible = activeCurators().filter(
    (u) => !c.excludedCuratorIds.includes(u.id)
  );
  const quorum = Math.ceil((eligible.length * 2) / 3);
  if (c.votes.length < quorum) return;
  const approve = c.votes.filter((v) => v.verdict !== "REJECT").length;
  const reject = c.votes.filter((v) => v.verdict === "REJECT").length;
  if (c.votes.length >= eligible.length || Math.abs(approve - reject) > eligible.length - c.votes.length) {
    if (approve === reject) {
      c.status = "TIE_PENDING";
      return;
    }
    const claimant = c.votes.filter((v) => v.verdict === "APPROVE_CLAIMANT").length;
    const accused = c.votes.filter((v) => v.verdict === "APPROVE_ACCUSED").length;
    c.finalVerdict =
      approve > reject
        ? claimant >= accused
          ? "APPROVE_CLAIMANT"
          : "APPROVE_ACCUSED"
        : "REJECT";
    c.verdictBy = "PANEL";
    c.status = "RESOLVED";
    c.resolvedAt = new Date().toISOString();
    c.correctionNote = c.votes.find((v) => v.correctionNote)?.correctionNote;
  }
}
