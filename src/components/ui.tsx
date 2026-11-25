import type { ReactNode } from "react";
import Link from "next/link";
import type { EntryState, POS } from "@/lib/types";
import {
  POS_LABEL,
  POS_STYLE,
  STATE_LABEL,
  STATE_STYLE,
} from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export function StateBadge({ state }: { state: EntryState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATE_STYLE[state]}`}
    >
      {STATE_LABEL[state]}
    </span>
  );
}

export function PosBadge({ pos, full = true }: { pos: POS; full?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${POS_STYLE[pos]}`}
    >
      {full ? POS_LABEL[pos] : pos}
    </span>
  );
}

export function IdChip({ id }: { id: string }) {
  return (
    <code className="inline-block max-w-full break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">
      {id}
    </code>
  );
}

export function LangBadge({ lang }: { lang: string }) {
  const code = (lang || "").toLowerCase();
  const style =
    code === "eng"
      ? "bg-sky-50 text-sky-700 ring-sky-200"
      : code === "ben"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-slate-100 text-slate-500 ring-slate-200";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${style}`}
    >
      {code || lang}
    </span>
  );
}

/** One synset definition (language code `ben` / `eng`). */
export type DefinitionItem = { language: string; text: string };

const LANG_ORDER: Record<string, number> = { ben: 0, eng: 1 };

/** Bengali first, then English. */
export function sortDefinitions<T extends DefinitionItem>(defs: readonly T[] | null | undefined): T[] {
  return [...(defs ?? [])].sort(
    (a, b) => (LANG_ORDER[a.language] ?? 9) - (LANG_ORDER[b.language] ?? 9)
  );
}

/**
 * All definitions of a synset, one below another, each with its BEN / ENG badge;
 * "No definition" when the synset has none.
 */
export function DefinitionList({
  definitions,
  emptyLabel = "No definition",
  size = "sm",
  clamp = false,
  className = "",
}: {
  definitions: readonly DefinitionItem[] | null | undefined;
  emptyLabel?: ReactNode;
  size?: "xs" | "sm" | "lg";
  /** Clamp each definition to two lines (compact cards). */
  clamp?: boolean;
  className?: string;
}) {
  const items = sortDefinitions(definitions).filter((d) => d.text && d.text.trim());
  if (items.length === 0) {
    return <p className={`text-xs italic text-slate-400 ${className}`}>{emptyLabel}</p>;
  }
  const text =
    size === "lg"
      ? "text-lg leading-relaxed text-slate-800"
      : size === "xs"
        ? "text-xs leading-relaxed text-slate-500"
        : "text-sm leading-relaxed text-slate-700";
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {items.map((d) => (
        <li key={d.language} className="flex items-start gap-2">
          <span className={size === "lg" ? "pt-1.5" : "pt-0.5"}>
            <LangBadge lang={d.language} />
          </span>
          <span
            lang={d.language === "eng" ? "en" : "bn"}
            className={`min-w-0 break-words ${d.language === "eng" ? "" : "font-bengali"} ${text} ${
              clamp ? "line-clamp-2" : ""
            }`}
          >
            {d.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Cards and layout primitives                                         */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:gap-4 sm:px-5">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "blue" | "green" | "red" | "amber" | "purple" | "orange";
  href?: string;
}) {
  const tones: Record<string, string> = {
    default: "text-slate-900",
    blue: "text-sky-700",
    green: "text-emerald-700",
    red: "text-rose-700",
    amber: "text-amber-700",
    purple: "text-purple-700",
    orange: "text-orange-600",
  };
  const inner = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-2 text-[clamp(1.5rem,4vw,1.875rem)] font-bold tabular-nums leading-none ${tones[tone]}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
        ∅
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-700">{title}</h3>
      {message ? (
        <p className="mt-1 max-w-sm text-xs text-slate-500">{message}</p>
      ) : null}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.35rem,3.5vw,1.75rem)] font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const windowPages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let p = start; p <= Math.min(totalPages, start + 4); p++) {
    windowPages.push(p);
  }
  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-medium transition";
  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      <Link
        aria-disabled={page <= 1}
        className={`${base} ${page <= 1 ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}
        href={hrefFor(Math.max(1, page - 1))}
      >
        ← Prev
      </Link>
      {windowPages[0] > 1 ? (
        <span className="px-1 text-slate-400">…</span>
      ) : null}
      {windowPages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          className={`${base} ${
            p === page
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {p}
        </Link>
      ))}
      {windowPages[windowPages.length - 1] < totalPages ? (
        <span className="px-1 text-slate-400">…</span>
      ) : null}
      <Link
        aria-disabled={page >= totalPages}
        className={`${base} ${page >= totalPages ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}
        href={hrefFor(Math.min(totalPages, page + 1))}
      >
        Next →
      </Link>
    </nav>
  );
}
