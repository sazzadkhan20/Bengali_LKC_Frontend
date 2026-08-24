"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Session } from "@/lib/types";

export function PublicHeader({ session }: { session: Session | null }) {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setNavOpen(false);
    setMenuOpen(false);
  }

  const nav = [
    { href: "/dictionary", label: t("dictionary") },
    { href: "/search", label: t("search") },
    { href: "/contribute", label: t("contribute") },
    { href: "/about", label: t("about") },
  ];

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const langToggle = (
    <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`min-h-9 px-2.5 py-1.5 transition ${lang === "en" ? "bg-emerald-700 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("bn")}
        className={`font-bengali min-h-9 px-2.5 py-1.5 transition ${lang === "bn" ? "bg-emerald-700 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
      >
        বাং
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 pt-[var(--safe-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:gap-6 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 font-bengali text-lg font-bold text-white shadow-sm">
            অ
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold tracking-tight text-slate-900">
              {t("appName")}
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:block">
              {t("localKnowledgeCore")}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname.startsWith(item.href)
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">{langToggle}</div>

          {session ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:px-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  {session.name.charAt(0)}
                </span>
                <span className="hidden max-w-[8rem] truncate sm:block">
                  {session.name.split(" ")[0]}
                </span>
                <span className="text-slate-400">▾</span>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {session.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t(`role_${session.role}`)}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("dashboard")}
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="block w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"
                  >
                    {t("logout")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 sm:px-4"
            >
              {t("login")}
            </Link>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50 md:hidden"
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
            aria-label={navOpen ? t("closeMenu") : t("openMenu")}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="text-lg leading-none" aria-hidden>
              {navOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {navOpen ? (
        <div
          id="mobile-nav"
          className="border-t border-slate-200 bg-white md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            <div className="mb-2 flex items-center justify-between sm:hidden">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("language")}
              </span>
              {langToggle}
            </div>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                className={`rounded-xl px-4 py-3 text-base font-medium transition ${
                  pathname.startsWith(item.href)
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {session ? (
              <Link
                href="/dashboard"
                onClick={() => setNavOpen(false)}
                className="rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                {t("dashboard")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
