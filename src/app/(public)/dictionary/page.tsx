import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import {
  BENGALI_ALPHABET,
  entriesByLetter,
  lexiconStats,
} from "@/lib/lexicon";
import { formatNumber, POS_LABEL } from "@/lib/format";
import { EntryCard } from "@/components/EntryCard";
import { EmptyState, PageTitle, Pagination } from "@/components/ui";
import type { POS } from "@/lib/types";

export const metadata: Metadata = { title: "Dictionary Browse" };

const PER_PAGE = 50; // SRS §8.1.1

export default async function DictionaryPage({
  searchParams,
}: {
  searchParams: Promise<{ letter?: string; page?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const showIds = session !== null;

  const letter =
    params.letter && entriesByLetter.has(params.letter)
      ? params.letter
      : "অ";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const all = entriesByLetter.get(letter) ?? [];
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const items = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const stats = lexiconStats();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageTitle
        title="Dictionary Browse"
        subtitle="Alphabetical browse of all validated entries, ordered by the Bengali Varnamala. Click any initial character to jump to that section."
      />

      {/* Statistics panel — authenticated roles only (SRS §8.1.1) */}
      {showIds ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Validated entries", value: stats.totalEntries },
            { label: "Synsets", value: stats.totalSynsets },
            {
              label: "Relations",
              value:
                Object.values(stats.synsetRelationCounts).reduce((a, b) => a + b, 0) +
                Object.values(stats.senseRelationCounts).reduce((a, b) => a + b, 0),
            },
            { label: "Word senses", value: stats.totalSenses },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <p className="text-lg font-bold tabular-nums text-emerald-800">
                {formatNumber(s.value)}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Varnamala index bar */}
      <nav
        aria-label="Bengali alphabet index"
        className="thin-scroll sticky top-14 z-30 -mx-1 mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur sm:top-16"
      >
        <div className="flex min-w-max gap-1">
          {BENGALI_ALPHABET.map((ch) => {
            const count = entriesByLetter.get(ch)?.length ?? 0;
            const active = ch === letter;
            return (
              <Link
                key={ch}
                href={`/dictionary?letter=${encodeURIComponent(ch)}`}
                aria-disabled={count === 0}
                className={`font-bengali flex h-10 w-10 items-center justify-center rounded-lg text-base font-semibold transition sm:h-9 sm:w-9 ${
                  active
                    ? "bg-emerald-700 text-white shadow"
                    : count === 0
                      ? "pointer-events-none text-slate-300"
                      : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
                title={`${ch} — ${count} entries`}
              >
                {ch}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-bengali text-xl font-bold text-slate-800">
            {letter}
          </span>{" "}
          — {formatNumber(all.length)} entries · page {page} of {totalPages}
        </p>
        <p className="hidden text-xs text-slate-400 sm:block">
          POS legend: {(["n", "v", "a", "r"] as POS[]).map((p) => POS_LABEL[p]).join(" · ")}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No entries under this letter"
          message="Try another character from the index bar above."
        />
      ) : (
        <div className="space-y-4">
          {items.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              showIds={showIds}
              compact
            />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(p) =>
          `/dictionary?letter=${encodeURIComponent(letter)}&page=${p}`
        }
      />
    </div>
  );
}
