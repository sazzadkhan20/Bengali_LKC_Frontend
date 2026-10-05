"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ROLE_LABEL, formatDate } from "@/lib/format";
import { useOptionalAuthSession } from "@/lib/session-context";
import type { Role } from "@/lib/types";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type UserStatusFilter = "ALL" | "ACTIVE" | "SUSPENDED" | "INACTIVE";

type UserRow = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  suspended: boolean;
  joinedAt: string | null;
};

const PAGE_SIZES = [15, 30, 50, 100] as const;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "CONTRIBUTOR", label: "Lexical Contributor" },
  { value: "LEXICAL_EDITOR", label: "Lexical Editor" },
  { value: "CHIEF_LEXICAL_EDITOR", label: "Chief Lexical Editor" },
  { value: "ARBITRATION_CURATOR", label: "Arbitration Curator" },
  { value: "SYSTEM_MODERATOR", label: "System Moderator" },
  { value: "PLATFORM_ARCHITECT", label: "Platform Architect" },
];

const STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "INACTIVE", label: "Inactive" },
];

function statusBadge(u: UserRow) {
  if (!u.active) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
        Inactive
      </span>
    );
  }
  if (u.suspended) {
    return (
      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
        Suspended
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
      Active
    </span>
  );
}

function UserToggle({
  userId,
  name,
  suspended,
  onDone,
}: {
  userId: string;
  name: string;
  suspended: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: !suspended }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Could not update account status."
        );
        return;
      }
      setOpen(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
          suspended
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100"
        }`}
      >
        {suspended ? "Reinstate" : "Suspend"}
      </button>
      <ConfirmModal
        open={open}
        title={suspended ? "Reinstate this account?" : "Suspend this account?"}
        description={
          suspended ? (
            <>
              Allow <strong>{name}</strong> to sign in and use the platform again?
              Their login credential will be restored.
            </>
          ) : (
            <>
              Suspend <strong>{name}</strong>? The account will be locked and their
              login credential frozen pending Platform Architect review.
            </>
          )
        }
        confirmLabel={suspended ? "Reinstate" : "Suspend"}
        tone={suspended ? "primary" : "danger"}
        busy={busy}
        onCancel={() => !busy && setOpen(false)}
        onConfirm={confirm}
      >
        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        ) : null}
      </ConfirmModal>
    </>
  );
}

export function UsersManager() {
  const auth = useOptionalAuthSession();
  const currentUserId = auth?.data?.session.userId ?? null;

  const [page, setPage] = useState(0);
  const [size, setSize] = useState<(typeof PAGE_SIZES)[number]>(15);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [status, setStatus] = useState<UserStatusFilter>("ALL");
  const [items, setItems] = useState<UserRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPage(0);
      setQ(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (q) params.set("q", q);
    if (role !== "ALL") params.set("role", role);
    if (status !== "ALL") params.set("status", status);
    return params.toString();
  }, [page, size, q, role, status]);
  const requestKey = `${query}#${reloadTick}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/users?${query}`, { credentials: "include", cache: "no-store", signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Could not load users.");
          setItems([]);
        } else {
          setError(null);
          setItems(Array.isArray(data.items) ? data.items : []);
          setTotalPages(Number(data.totalPages) || 0);
          setTotalElements(Number(data.totalElements) || 0);
        }
        setLoadedKey(requestKey);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setError("Could not load users.");
        setLoadedKey(requestKey);
      });
    return () => ctrl.abort();
  }, [query, requestKey]);

  const load = useCallback(() => setReloadTick((t) => t + 1), []);

  const rangeLabel = useMemo(() => {
    if (!totalElements) return "0 users";
    const from = page * size + 1;
    const to = Math.min((page + 1) * size, totalElements);
    return `${from}–${to} of ${totalElements}`;
  }, [page, size, totalElements]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-800">All users</h2>
        <p className="text-xs text-slate-500">{rangeLabel}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_200px_180px]">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by full name, username, or email"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <select
            value={role}
            onChange={(e) => {
              setPage(0);
              setRole(e.target.value as Role | "ALL");
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="ALL">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setPage(0);
              setStatus(e.target.value as UserStatusFilter);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="m-5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      <div className="thin-scroll relative overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-3 py-3 font-semibold">Role</th>
              <th className="px-3 py-3 font-semibold">Email</th>
              <th className="px-3 py-3 font-semibold">Joined</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                  Loading users…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                  No users match your search.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr
                  key={u.id}
                  className={
                    u.suspended
                      ? "bg-rose-50/40"
                      : !u.active
                        ? "bg-slate-50/80"
                        : ""
                  }
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{u.name}</p>
                    <p className="font-mono text-[11px] text-slate-400">@{u.username}</p>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-slate-600">
                    {ROLE_LABEL[u.role] ?? u.role}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400">{u.email}</td>
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {u.joinedAt ? formatDate(u.joinedAt) : "—"}
                  </td>
                  <td className="px-3 py-3">{statusBadge(u)}</td>
                  <td className="px-5 py-3 text-right">
                    {currentUserId && u.id === currentUserId ? (
                      <span className="text-xs text-slate-300">you</span>
                    ) : (
                      <UserToggle
                        userId={u.id}
                        name={u.name}
                        suspended={u.suspended}
                        onDone={load}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          disabled={page <= 0 || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 disabled:opacity-40"
        >
          Previous
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Page {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Rows
            <select
              value={size}
              onChange={(e) => {
                setPage(0);
                setSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-emerald-500"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={page + 1 >= totalPages || loading}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}
