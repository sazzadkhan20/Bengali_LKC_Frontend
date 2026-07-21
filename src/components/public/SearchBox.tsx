"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function SearchBox({
  initialQuery = "",
  target = "/search",
  large = false,
}: {
  initialQuery?: string;
  target?: string;
  large?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [q, setQ] = useState(initialQuery);

  return (
    <form
      className={`flex w-full gap-2 ${large ? "flex-col sm:flex-row" : "flex-row"}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`${target}?q=${encodeURIComponent(q.trim())}`);
      }}
      role="search"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className={`font-bengali w-full min-w-0 rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 ${
          large
            ? "px-4 py-3.5 text-base sm:px-5 sm:py-4 sm:text-lg"
            : "px-3.5 py-2.5 text-sm sm:px-4"
        }`}
        lang="bn"
        aria-label={t("wordSearch")}
        enterKeyHint="search"
        autoCapitalize="none"
        autoCorrect="off"
      />
      <button
        type="submit"
        className={`shrink-0 rounded-xl bg-emerald-700 font-semibold text-white shadow-sm transition hover:bg-emerald-800 ${
          large
            ? "min-h-12 px-6 py-3.5 text-base sm:px-7 sm:py-4"
            : "min-h-10 px-4 py-2.5 text-sm sm:px-5"
        }`}
      >
        {t("search")}
      </button>
    </form>
  );
}
