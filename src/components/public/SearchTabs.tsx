"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Tabs({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q");

  const tabs = [
    { href: "/search", label: "Word", public: true },
    { href: "/search/gloss", label: "Gloss", public: true },
    { href: "/search/synset", label: "Synset / ILI", public: false },
    { href: "/search/sense", label: "Sense ID", public: false },
  ];

  return (
    <nav className="thin-scroll mt-6 -mx-1 overflow-x-auto border-b border-slate-200 px-1">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const locked = !tab.public && !authenticated;
          return (
            <Link
              key={tab.href}
              href={
                locked
                  ? "/login"
                  : q
                    ? `${tab.href}?q=${encodeURIComponent(q)}`
                    : tab.href
              }
              className={`-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
                active
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
              {locked ? <span className="ml-1.5 text-xs">🔒</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SearchTabs({ authenticated }: { authenticated: boolean }) {
  return (
    <Suspense>
      <Tabs authenticated={authenticated} />
    </Suspense>
  );
}
