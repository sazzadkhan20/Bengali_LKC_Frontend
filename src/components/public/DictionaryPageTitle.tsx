"use client";

import { useI18n } from "@/lib/i18n";
import { PageTitle } from "@/components/ui";

export function DictionaryPageTitle() {
  const { t } = useI18n();
  return (
    <PageTitle title={t("dictionaryTitle")} subtitle={t("dictionarySubtitle")} />
  );
}
