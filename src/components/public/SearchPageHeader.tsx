"use client";

import { useI18n } from "@/lib/i18n";
import { SearchTabs } from "./SearchTabs";

export function SearchPageHeader({ authenticated }: { authenticated: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <h1 className="text-[clamp(1.35rem,3.5vw,1.75rem)] font-bold tracking-tight text-slate-900">
        {t("searchLexiconTitle")}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {authenticated ? t("searchLexiconAuth") : t("searchLexiconGuest")}
      </p>
      <SearchTabs authenticated={authenticated} />
    </>
  );
}
