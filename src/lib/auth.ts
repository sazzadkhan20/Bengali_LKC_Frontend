import "server-only";
import { cookies } from "next/headers";
import type { Role, Session } from "./types";
import { credentialForUser, store } from "./store";

export const SESSION_COOKIE = "lkc_session";

/** Resolve the current session from the signed demo cookie. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as Session;
    const user = store.users.find((u) => u.id === parsed.userId);
    if (!user || !user.active || user.suspended) return null;
    // Deactivating a credential immediately invalidates all sessions (SRS §3.2).
    const credential = credentialForUser(user.id);
    if (!credential || credential.deactivated) return null;
    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      // Live flag: the one-time password must be replaced before the user
      // can access any other part of the platform (SRS §3.2).
      mustChangePassword: credential.oneTime || undefined,
    };
  } catch {
    return null;
  }
}

export function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

/* ------------------------------------------------------------------ */
/* Permission matrix (SRS §3.3)                                        */
/* ------------------------------------------------------------------ */

export type Permission =
  | "manage_users"
  | "manage_credentials"
  | "system_config"
  | "audit_log"
  | "xml_export"
  | "quick_input"
  | "direct_approval"
  | "view_pending_queue"
  | "primary_validate"
  | "view_editor_approved_queue"
  | "final_validate"
  | "escalate"
  | "arbitration_vote"
  | "tie_breaker"
  | "apply_corrections"
  | "override_state"
  | "assign_entries"
  | "bulk_operations"
  | "search_internal"
  | "statistics"
  | "dispute"
  | "community"
  | "community_moderate"
  | "leaderboard_ranked";

const MATRIX: Record<Permission, Role[]> = {
  manage_users: ["PLATFORM_ARCHITECT"],
  manage_credentials: ["PLATFORM_ARCHITECT"],
  system_config: ["PLATFORM_ARCHITECT"],
  audit_log: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR"],
  xml_export: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR"],
  quick_input: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR", "CONTRIBUTOR"],
  direct_approval: ["SYSTEM_MODERATOR"],
  view_pending_queue: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR", "LEXICAL_EDITOR"],
  primary_validate: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR", "LEXICAL_EDITOR"],
  view_editor_approved_queue: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR", "CHIEF_LEXICAL_EDITOR"],
  final_validate: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR", "CHIEF_LEXICAL_EDITOR"],
  escalate: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR", "LEXICAL_EDITOR", "CHIEF_LEXICAL_EDITOR"],
  arbitration_vote: ["ARBITRATION_CURATOR"],
  tie_breaker: ["SYSTEM_MODERATOR"],
  apply_corrections: ["SYSTEM_MODERATOR"],
  override_state: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR"],
  assign_entries: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR"],
  bulk_operations: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR"],
  search_internal: [
    "PLATFORM_ARCHITECT",
    "SYSTEM_MODERATOR",
    "CONTRIBUTOR",
    "LEXICAL_EDITOR",
    "CHIEF_LEXICAL_EDITOR",
    "ARBITRATION_CURATOR",
  ],
  statistics: [
    "PLATFORM_ARCHITECT",
    "SYSTEM_MODERATOR",
    "CONTRIBUTOR",
    "LEXICAL_EDITOR",
    "CHIEF_LEXICAL_EDITOR",
    "ARBITRATION_CURATOR",
  ],
  dispute: ["CONTRIBUTOR"],
  /* Author Community Board (SRS §14) — all authenticated authors */
  community: [
    "PLATFORM_ARCHITECT",
    "SYSTEM_MODERATOR",
    "CONTRIBUTOR",
    "LEXICAL_EDITOR",
    "CHIEF_LEXICAL_EDITOR",
    "ARBITRATION_CURATOR",
  ],
  community_moderate: ["SYSTEM_MODERATOR"],
  /* Roles that earn reward points and are ranked (SRS §7.8) */
  leaderboard_ranked: ["CONTRIBUTOR", "LEXICAL_EDITOR", "CHIEF_LEXICAL_EDITOR"],
};

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return MATRIX[permission].includes(role);
}
