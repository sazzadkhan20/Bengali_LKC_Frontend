import "server-only";
import { cookies } from "next/headers";
import type { Role, Session, User } from "./types";
import { backendFetch } from "./backend";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./auth-cookies";
import { isAccessTokenFresh, refreshTokens } from "./token-refresh";

export const SESSION_COOKIE = ACCESS_COOKIE;

export type SessionPayload = {
  ok: boolean;
  session: Session & {
    expiresAt?: string;
    expiresInSeconds?: number;
    sessionTimeoutMinutes?: number;
  };
  profile: User;
  permissions: string[];
  standing?: Record<string, unknown>;
  mustChangePassword?: boolean;
};

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
  direct_approval: ["PLATFORM_ARCHITECT", "SYSTEM_MODERATOR"],
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
  community: [
    "PLATFORM_ARCHITECT",
    "SYSTEM_MODERATOR",
    "CONTRIBUTOR",
    "LEXICAL_EDITOR",
    "CHIEF_LEXICAL_EDITOR",
    "ARBITRATION_CURATOR",
  ],
  community_moderate: ["SYSTEM_MODERATOR"],
  leaderboard_ranked: ["CONTRIBUTOR", "LEXICAL_EDITOR", "CHIEF_LEXICAL_EDITOR"],
};

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return MATRIX[permission].includes(role);
}

function mapSession(raw: Record<string, unknown> | undefined): Session | null {
  if (!raw || typeof raw.userId !== "string" || typeof raw.role !== "string") {
    return null;
  }
  return {
    userId: raw.userId,
    username: String(raw.username ?? ""),
    name: String(raw.name ?? ""),
    role: raw.role as Role,
    mustChangePassword: Boolean(raw.mustChangePassword) || undefined,
  };
}

/**
 * Resolve the current session via the backend session API (access JWT + optional refresh).
 * Returns null when unauthenticated or when both tokens are invalid/expired.
 */
export async function getSession(): Promise<Session | null> {
  const payload = await getSessionPayload();
  return payload?.session ?? null;
}

/** Full session payload (profile, permissions, standing) for authenticated UI. */
export async function getSessionPayload(): Promise<SessionPayload | null> {
  try {
    const jar = await cookies();
    let access = jar.get(ACCESS_COOKIE)?.value ?? null;
    const refresh = jar.get(REFRESH_COOKIE)?.value ?? null;
    if (!access && !refresh) return null;

    if (!isAccessTokenFresh(access) && refresh) {
      access = (await refreshTokens(refresh))?.accessToken ?? null;
    }

    let result = access
      ? await backendFetch<Record<string, unknown>>("/api/auth/session", {
          method: "GET",
          accessToken: access,
        })
      : { ok: false, status: 401, data: {} as Record<string, unknown> };

    if (result.status === 401 && refresh) {
      const refreshed = await refreshTokens(refresh);
      if (refreshed && refreshed.accessToken !== access) {
        access = refreshed.accessToken;
        result = await backendFetch<Record<string, unknown>>("/api/auth/session", {
          method: "GET",
          accessToken: access,
        });
      }
    }

    if (!result.ok) return null;

    const session = mapSession(result.data.session as Record<string, unknown> | undefined);
    const profile = result.data.profile as User | undefined;
    if (!session || !profile) return null;

    return {
      ok: true,
      session: {
        ...session,
        expiresAt:
          typeof (result.data.session as { expiresAt?: string })?.expiresAt === "string"
            ? (result.data.session as { expiresAt: string }).expiresAt
            : undefined,
        expiresInSeconds:
          typeof (result.data.session as { expiresInSeconds?: number })?.expiresInSeconds ===
          "number"
            ? (result.data.session as { expiresInSeconds: number }).expiresInSeconds
            : undefined,
        sessionTimeoutMinutes:
          typeof (result.data.session as { sessionTimeoutMinutes?: number })
            ?.sessionTimeoutMinutes === "number"
            ? (result.data.session as { sessionTimeoutMinutes: number }).sessionTimeoutMinutes
            : undefined,
      },
      profile,
      permissions: Array.isArray(result.data.permissions)
        ? (result.data.permissions as string[])
        : [],
      standing: result.data.standing as Record<string, unknown> | undefined,
      mustChangePassword: Boolean(result.data.mustChangePassword),
    };
  } catch (err) {
    console.error("[getSessionPayload]", err);
    return null;
  }
}

/** @deprecated Demo cookie encoder — kept for type compatibility; prefer backend JWT cookies. */
export function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}
