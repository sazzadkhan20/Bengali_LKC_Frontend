"use client";

import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";

const DHAKA_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

export function dhakaDate(iso: string): string {
  return DHAKA_DATE.format(new Date(iso));
}

export function CrowdsourcedBadge({
  validatedAt,
  size = "sm",
}: {
  validatedAt?: string | null;
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  const title = validatedAt
    ? `${t("crowdsourcedTitle")} · ${t("validatedOn")} ${dhakaDate(validatedAt)}`
    : t("crowdsourcedTitle");
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 font-bold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200 ${
        size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
        <path d="M8 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm-4.5 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm9 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM8 7.5c2.6 0 4.5 1.6 4.5 3.6V13a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-1.9c0-2 1.9-3.6 4.5-3.6Zm-4.9.9A4.4 4.4 0 0 0 2.5 11v1.5H.5A.5.5 0 0 1 0 12v-1.1c0-1.3 1.2-2.4 2.9-2.5h.2Zm9.8 0h.2c1.7.1 2.9 1.2 2.9 2.5V12a.5.5 0 0 1-.5.5h-2V11c0-1-.2-1.9-.6-2.6Z" />
      </svg>
      {t("crowdsourced")}
    </span>
  );
}

export function ValidatedNote({ validatedAt }: { validatedAt: string | null }) {
  const { t } = useI18n();
  if (!validatedAt) return null;
  return (
    <span className="text-[11px] text-slate-400">
      {t("validatedOn")} {dhakaDate(validatedAt)}
    </span>
  );
}

export function LexiconUnavailable({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center"
    >
      <p className="text-sm font-semibold text-red-800">
        {message ?? t("lexiconUnavailable")}
      </p>
      <p className="mt-1 text-xs text-red-700">{t("lexiconUnavailableHint")}</p>
    </div>
  );
}

export function ResultRange({
  page,
  size,
  total,
}: {
  page: number;
  size: number;
  total: number;
}) {
  const { t } = useI18n();
  if (total === 0) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return (
    <span>
      {t("showingRange")
        .replace("{from}", formatNumber(from))
        .replace("{to}", formatNumber(to))
        .replace("{total}", formatNumber(total))}
    </span>
  );
}
