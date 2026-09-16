"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role, Session, User } from "@/lib/types";

export type AuthSessionData = {
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

type SessionContextValue = {
  data: AuthSessionData | null;
  loading: boolean;
  refresh: () => Promise<AuthSessionData | null>;
  clear: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function mapFromApi(payload: Record<string, unknown>): AuthSessionData | null {
  const rawSession = payload.session as Record<string, unknown> | undefined;
  const profile = payload.profile as User | undefined;
  if (!rawSession || !profile || typeof rawSession.userId !== "string") {
    return null;
  }
  const session: AuthSessionData["session"] = {
    userId: rawSession.userId,
    username: String(rawSession.username ?? profile.username),
    name: String(rawSession.name ?? profile.name),
    role: (rawSession.role as Role) ?? profile.role,
    mustChangePassword: Boolean(rawSession.mustChangePassword || payload.mustChangePassword)
      || undefined,
    expiresAt: typeof rawSession.expiresAt === "string" ? rawSession.expiresAt : undefined,
    expiresInSeconds:
      typeof rawSession.expiresInSeconds === "number"
        ? rawSession.expiresInSeconds
        : undefined,
    sessionTimeoutMinutes:
      typeof rawSession.sessionTimeoutMinutes === "number"
        ? rawSession.sessionTimeoutMinutes
        : undefined,
  };
  return {
    session,
    profile,
    permissions: Array.isArray(payload.permissions)
      ? (payload.permissions as string[])
      : [],
    standing: payload.standing as Record<string, unknown> | undefined,
    mustChangePassword: Boolean(payload.mustChangePassword),
  };
}

export function SessionProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: AuthSessionData | null;
}) {
  const [data, setData] = useState<AuthSessionData | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setData(null);
        return null;
      }
      const payload = (await res.json()) as Record<string, unknown>;
      const mapped = mapFromApi(payload);
      setData(mapped);
      return mapped;
    } catch {
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setData(null), []);

  useEffect(() => {
    // Always reconcile with backend so profile/permissions stay fresh after login.
    void refresh();
  }, [refresh]);

  // Proactively refresh access token ~2 minutes before expiry (1-hour sessions).
  useEffect(() => {
    if (!data?.session.expiresAt) return;
    const expiresMs = Date.parse(data.session.expiresAt);
    if (Number.isNaN(expiresMs)) return;
    const delay = Math.max(expiresMs - Date.now() - 120_000, 15_000);
    const id = window.setTimeout(() => {
      void fetch("/api/auth/refresh", { method: "POST", credentials: "include" }).then(
        (res) => {
          if (res.ok) void refresh();
        }
      );
    }, delay);
    return () => window.clearTimeout(id);
  }, [data?.session.expiresAt, refresh]);

  const value = useMemo(
    () => ({ data, loading, refresh, clear }),
    [data, loading, refresh, clear]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAuthSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within SessionProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (public pages). */
export function useOptionalAuthSession() {
  return useContext(SessionContext);
}
