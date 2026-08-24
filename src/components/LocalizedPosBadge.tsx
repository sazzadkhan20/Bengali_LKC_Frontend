"use client";

import type { POS } from "@/lib/types";
import { POS_STYLE } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function LocalizedPosBadge({
  pos,
  full = true,
}: {
  pos: POS;
  full?: boolean;
}) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${POS_STYLE[pos]}`}
    >
      {full ? t(`pos_${pos}`) : pos}
    </span>
  );
}
