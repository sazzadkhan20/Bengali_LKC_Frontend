"use client";

import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import type { POS } from "@/lib/types";

export function DictionaryLetterMeta({
  letter,
  count,
  page,
  totalPages,
}: {
  letter: string;
  count: number;
  page: number;
  totalPages: number;
}) {
  const { t } = useI18n();
  const posOrder: POS[] = ["n", "v", "a", "r"];
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <p className="text-sm text-slate-500">
        <span className="font-bengali text-xl font-bold text-slate-800">
          {letter}
        </span>{" "}
        — {formatNumber(count)} {t("entriesPageOf")} {page} {t("of")}{" "}
        {totalPages}
      </p>
      <p className="hidden text-xs text-slate-400 sm:block">
        {t("posLegend")}: {posOrder.map((p) => t(`pos_${p}`)).join(" · ")}
      </p>
    </div>
  );
}

export function DictionaryEmpty() {
  const { t } = useI18n();
  return (
    <EmptyState title={t("noEntriesLetter")} message={t("tryAnotherLetter")} />
  );
}
