"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Role, Session } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: string;
  icon: string;
}

/** Role-specific navigation menus (SRS §7.1.2 – §7.6.3). */
function navFor(role: Role): NavItem[] {
  const common: NavItem[] = [
    { href: "/dashboard", labelKey: "navDashboard", icon: "▦" },
    { href: "/dashboard/leaderboard", labelKey: "navLeaderboard", icon: "🏆" },
    { href: "/dashboard/community", labelKey: "navCommunity", icon: "🗨" },
  ];
  const explore: NavItem[] = [
    { href: "/dictionary", labelKey: "navDictionary", icon: "📖" },
    { href: "/search", labelKey: "navSearch", icon: "🔍" },
    { href: "/dashboard/ili-finder", labelKey: "navIliFinder", icon: "🔗" },
    { href: "/dashboard/statistics", labelKey: "navStatistics", icon: "📊" },
  ];
  switch (role) {
    case "PLATFORM_ARCHITECT":
      return [
        ...common,
        { href: "/dashboard/users", labelKey: "navUsers", icon: "👥" },
        { href: "/dashboard/credentials", labelKey: "navCredentials", icon: "🔑" },
        { href: "/dashboard/queue", labelKey: "navQueue", icon: "🗂" },
        { href: "/dashboard/quick-input", labelKey: "navQuickInput", icon: "✎" },
        ...explore,
        { href: "/dashboard/export", labelKey: "navExport", icon: "⇩" },
        { href: "/dashboard/audit", labelKey: "navAudit", icon: "🛡" },
        { href: "/dashboard/config", labelKey: "navConfig", icon: "⚙" },
      ];
    case "SYSTEM_MODERATOR":
      return [
        ...common,
        { href: "/dashboard/queue", labelKey: "navQueue", icon: "🗂" },
        { href: "/dashboard/quick-input", labelKey: "navQuickInputMod", icon: "✎" },
        { href: "/dashboard/arbitration", labelKey: "navArbitrationTie", icon: "⚖" },
        { href: "/dashboard/corrections", labelKey: "navCorrections", icon: "🩹" },
        ...explore,
        { href: "/dashboard/audit", labelKey: "navAudit", icon: "🛡" },
        { href: "/dashboard/export", labelKey: "navExport", icon: "⇩" },
      ];
    case "CONTRIBUTOR":
      return [
        ...common,
        { href: "/dashboard/quick-input", labelKey: "navQuickInputContrib", icon: "✎" },
        { href: "/dashboard/submissions", labelKey: "navSubmissions", icon: "🗂" },
        { href: "/dashboard/arbitration", labelKey: "navDisputes", icon: "⚖" },
        ...explore,
      ];
    case "LEXICAL_EDITOR":
      return [
        ...common,
        { href: "/dashboard/queue", labelKey: "navReviewQueue", icon: "🗂" },
        { href: "/dashboard/history", labelKey: "navHistory", icon: "🕘" },
        { href: "/dashboard/arbitration", labelKey: "navEscalations", icon: "⚖" },
        ...explore,
      ];
    case "CHIEF_LEXICAL_EDITOR":
      return [
        ...common,
        { href: "/dashboard/queue", labelKey: "navLingQueue", icon: "🗂" },
        { href: "/dashboard/history", labelKey: "navValHistory", icon: "🕘" },
        { href: "/dashboard/arbitration", labelKey: "navEscalations", icon: "⚖" },
        ...explore,
      ];
    case "ARBITRATION_CURATOR":
      return [
        ...common,
        { href: "/dashboard/arbitration", labelKey: "navArbCases", icon: "⚖" },
        ...explore,
      ];
  }
}

export function DashboardSidebar({ session }: { session: Session }) {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = navFor(session.role);
  const roleLabel = t(`role_${session.role}`);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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
          <span className="block text-sm font-bold text-white">{t("appName")}</span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-emerald-300/70">
            {t("localKnowledgeCore")}
          </span>
        </span>
      </Link>

      <Link
        href={`/dashboard/community/profile/${session.userId}`}
        onClick={() => setOpen(false)}
        title={t("viewProfile")}
        className="group mx-4 mb-4 block rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-emerald-400/40"
      >
        <p className="truncate text-sm font-semibold text-white group-hover:text-emerald-200">
          {session.name}
        </p>
        <p className="text-[11px] font-medium text-emerald-300">{roleLabel}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 group-hover:text-emerald-300/80">
          {t("viewProfile")}
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
              <span className="min-w-0 leading-snug">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex overflow-hidden rounded-lg border border-white/15 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`min-h-9 flex-1 px-2.5 py-1.5 transition ${lang === "en" ? "bg-emerald-500 text-emerald-950" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang("bn")}
            className={`font-bengali min-h-9 flex-1 px-2.5 py-1.5 transition ${lang === "bn" ? "bg-emerald-500 text-emerald-950" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
          >
            বাং
          </button>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <span className="w-5 text-center">⏻</span> {t("logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 pt-[max(0.75rem,var(--safe-top))] lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white"
          aria-expanded={open}
          aria-label={t("toggleNav")}
        >
          ☰
        </button>
        <span className="min-w-0 truncate text-sm font-bold text-white">
          {t("appName")}
        </span>
        <span className="ml-auto max-w-[40%] truncate text-right text-[11px] text-emerald-300 sm:text-xs">
          {roleLabel}
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
