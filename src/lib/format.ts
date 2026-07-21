import type { EntryState, POS, Role } from "./types";

export const POS_LABEL: Record<POS, string> = {
  n: "Noun",
  v: "Verb",
  a: "Adjective",
  r: "Adverb",
};

export const POS_LABEL_BN: Record<POS, string> = {
  n: "বিশেষ্য",
  v: "ক্রিয়া",
  a: "বিশেষণ",
  r: "ক্রিয়া বিশেষণ",
};

export const ROLE_LABEL: Record<Role, string> = {
  PLATFORM_ARCHITECT: "Platform Architect",
  SYSTEM_MODERATOR: "System Moderator",
  CONTRIBUTOR: "Lexical Contributor",
  LEXICAL_EDITOR: "Lexical Editor",
  CHIEF_LEXICAL_EDITOR: "Chief Lexical Editor",
  ARBITRATION_CURATOR: "Arbitration Curator",
};

export const STATE_LABEL: Record<EntryState, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  UNDER_REVIEW: "Under Review",
  FLAGGED: "Flagged",
  C_FLAGGED: "C-Flagged",
  EDITOR_APPROVED: "Editor Approved",
  ARBITRATION: "Arbitration",
  VALIDATED: "Validated",
  REJECTED: "Rejected",
};

/** Tailwind classes for state badges. */
export const STATE_STYLE: Record<EntryState, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-300",
  PENDING_REVIEW: "bg-sky-50 text-sky-700 ring-sky-200",
  UNDER_REVIEW: "bg-orange-50 text-orange-700 ring-orange-200",
  FLAGGED: "bg-amber-50 text-amber-800 ring-amber-200",
  C_FLAGGED: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
  EDITOR_APPROVED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  ARBITRATION: "bg-purple-50 text-purple-700 ring-purple-200",
  VALIDATED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const POS_STYLE: Record<POS, string> = {
  n: "bg-sky-50 text-sky-700 ring-sky-200",
  v: "bg-rose-50 text-rose-700 ring-rose-200",
  a: "bg-amber-50 text-amber-800 ring-amber-200",
  r: "bg-violet-50 text-violet-700 ring-violet-200",
};

export const REL_LABEL: Record<string, string> = {
  hypernym: "Hypernym (is-a)",
  hyponym: "Hyponym (kind)",
  mero_part: "Meronym (part)",
  mero_substance: "Meronym (substance)",
  mero_member: "Meronym (member)",
  holo_part: "Holonym (whole)",
  holo_substance: "Holonym (substance)",
  holo_member: "Holonym (group)",
  attribute: "Attribute",
  derivation: "Derivation",
  antonym: "Antonym",
  metonym: "Metonym",
};

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Wall-clock ms snapshot; call from components instead of `Date.now()`. */
export function nowMs(): number {
  return Date.now();
}

export function timeAgo(isoDate: string): string {
  const seconds = (nowMs() - new Date(isoDate).getTime()) / 1000;
  if (seconds < 0) {
    const future = -seconds;
    if (future < 3600) return `in ${Math.round(future / 60)} min`;
    if (future < 86400) return `in ${Math.round(future / 3600)} hr`;
    return `in ${Math.round(future / 86400)} days`;
  }
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hr ago`;
  return `${Math.round(seconds / 86400)} days ago`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
