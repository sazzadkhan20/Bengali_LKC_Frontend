"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Role, Session } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/format";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** Role-specific navigation menus (SRS §7.1.2 – §7.6.3). */
function navFor(role: Role): NavItem[] {
  const common: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "▦" },
    { href: "/dashboard/leaderboard", label: "Leader Board", icon: "🏆" },
    { href: "/dashboard/community", label: "Community", icon: "🗨" },
  ];
  const explore: NavItem[] = [
    { href: "/dictionary", label: "Dictionary Browse", icon: "📖" },
    { href: "/search", label: "Search", icon: "🔍" },
    { href: "/dashboard/ili-finder", label: "ILI Finder", icon: "🔗" },
    { href: "/dashboard/statistics", label: "Data Statistics", icon: "📊" },
  ];
  switch (role) {
    case "PLATFORM_ARCHITECT":
      return [
        ...common,
        { href: "/dashboard/users", label: "User Management", icon: "👥" },
        { href: "/dashboard/credentials", label: "Credential Management", icon: "🔑" },
        { href: "/dashboard/queue", label: "Queue Management", icon: "🗂" },
        { href: "/dashboard/quick-input", label: "Data Entry (Quick Input)", icon: "✎" },
        ...explore,
        { href: "/dashboard/export", label: "XML Export", icon: "⇩" },
        { href: "/dashboard/audit", label: "Audit Log", icon: "🛡" },
        { href: "/dashboard/config", label: "System Configuration", icon: "⚙" },
      ];
    case "SYSTEM_MODERATOR":
      return [
        ...common,
        { href: "/dashboard/queue", label: "Queue Management", icon: "🗂" },
        { href: "/dashboard/quick-input", label: "Quick Input / Direct Approval", icon: "✎" },
        { href: "/dashboard/arbitration", label: "Arbitration Tie-Breaker", icon: "⚖" },
        { href: "/dashboard/corrections", label: "Pending Corrections", icon: "🩹" },
        ...explore,
        { href: "/dashboard/audit", label: "Audit Log", icon: "🛡" },
        { href: "/dashboard/export", label: "XML Export", icon: "⇩" },
      ];
    case "CONTRIBUTOR":
      return [
        ...common,
        { href: "/dashboard/quick-input", label: "New Entry (Quick Input)", icon: "✎" },
        { href: "/dashboard/submissions", label: "My Submissions", icon: "🗂" },
        { href: "/dashboard/arbitration", label: "My Disputes", icon: "⚖" },
        ...explore,
      ];
    case "LEXICAL_EDITOR":
      return [
        ...common,
        { href: "/dashboard/queue", label: "Review Queue", icon: "🗂" },
        { href: "/dashboard/history", label: "My Review History", icon: "🕘" },
        { href: "/dashboard/arbitration", label: "My Escalations & Disputes", icon: "⚖" },
        ...explore,
      ];
    case "CHIEF_LEXICAL_EDITOR":
      return [
        ...common,
        { href: "/dashboard/queue", label: "Linguistic Review Queue", icon: "🗂" },
        { href: "/dashboard/history", label: "My Validation History", icon: "🕘" },
        { href: "/dashboard/arbitration", label: "My Escalations & Disputes", icon: "⚖" },
        ...explore,
      ];
    case "ARBITRATION_CURATOR":
      return [
        ...common,
        { href: "/dashboard/arbitration", label: "Arbitration Cases", icon: "⚖" },
        ...explore,
      ];
  }
}

export function DashboardSidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = navFor(session.role);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const nav = (
    <nav className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 font-bengali text-lg font-bold text-emerald-950">
          অ
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold text-white">Bengali LKC</span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-emerald-300/70">
            Local Knowledge Core
          </span>
        </span>
      </Link>

      <Link
        href={`/dashboard/community/profile/${session.userId}`}
        onClick={() => setOpen(false)}
        title="View my author profile"
        className="group mx-4 mb-4 block rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-emerald-400/40"
      >
        <p className="truncate text-sm font-semibold text-white group-hover:text-emerald-200">
          {session.name}
        </p>
        <p className="text-[11px] font-medium text-emerald-300">
          {ROLE_LABEL[session.role]}
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 group-hover:text-emerald-300/80">
          View profile →
        </p>
      </Link>

      <div className="thin-scroll flex-1 space-y-0.5 overflow-y-auto px-3">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/30"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="w-5 shrink-0 text-center text-base leading-none">
                {item.icon}
              </span>
              <span className="min-w-0 leading-snug">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <span className="w-5 text-center">⏻</span> Logout
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 pt-[max(0.75rem,var(--safe-top))] lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white"
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <span className="min-w-0 truncate text-sm font-bold text-white">
          Bengali LKC
        </span>
        <span className="ml-auto max-w-[40%] truncate text-right text-[11px] text-emerald-300 sm:text-xs">
          {ROLE_LABEL[session.role]}
        </span>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-slate-900 pb-[var(--safe-bottom)] pl-[var(--safe-left)] shadow-2xl">
            {nav}
          </aside>
        </div>
      ) : null}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 bg-slate-900 lg:block">
        {nav}
      </aside>
    </>
  );
}
