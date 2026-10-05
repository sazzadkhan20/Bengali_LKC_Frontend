import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import {
  fetchBrowse,
  fetchLexiconStats,
  parsePage,
  parsePosFilter,
} from "@/lib/lexicon-api";
import { formatNumber } from "@/lib/format";
import { EntryCard } from "@/components/EntryCard";
import { DictionaryPageTitle } from "@/components/public/DictionaryPageTitle";
import {
  DictionaryEmpty,
  DictionaryLetterMeta,
  DictionaryPosFilter,
  DictionaryStats,
} from "@/components/public/DictionaryChrome";
import { LexiconUnavailable } from "@/components/public/LexiconBits";
import { Pagination } from "@/components/ui";

export const metadata: Metadata = { title: "Dictionary Browse" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50; // SRS §8.1.1

export default async function DictionaryPage({
  searchParams,
}: {
  searchParams: Promise<{ letter?: string; page?: string; pos?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const showIds = session !== null;
  const pos = parsePosFilter(params.pos);
  const page = parsePage(params.page);

  const [browse, stats] = await Promise.all([
    fetchBrowse(params.letter, pos, page, PER_PAGE),
    showIds ? fetchLexiconStats() : Promise.resolve(null),
  ]);

  const hrefFor = (next: { letter?: string; page?: number; pos?: string[] }) => {
    const qs = new URLSearchParams();
    const letter = next.letter ?? (browse.ok ? browse.data.letter : params.letter);
    if (letter) qs.set("letter", letter);
    const nextPos = next.pos ?? pos;
    if (nextPos.length) qs.set("pos", nextPos.join(","));
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    return `/dictionary?${qs.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <DictionaryPageTitle />

      {/* Statistics panel — authenticated roles only (SRS §8.1.1) */}
      {stats?.ok ? <DictionaryStats stats={stats.data} /> : null}

      {!browse.ok ? (
        <LexiconUnavailable />
      ) : (
        <>
          <nav
            aria-label="Bengali alphabet index"
            className="thin-scroll sticky top-14 z-30 -mx-1 mb-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur sm:top-16"
          >
            <div className="flex min-w-max gap-1">
              {browse.data.letters.map(({ letter: ch, count }) => {
                const active = ch === browse.data.letter;
                const label = `${ch} — ${formatNumber(count)} entries`;
                if (count === 0) {
                  return (
                    <span
                      key={ch}
                      aria-disabled="true"
                      title={label}
                      className="font-bengali flex h-10 w-10 items-center justify-center rounded-lg text-base font-semibold text-slate-300 sm:h-9 sm:w-9"
                    >
                      {ch}
                    </span>
                  );
                }
                return (
                  <Link
                    key={ch}
                    href={hrefFor({ letter: ch, page: 1 })}
                    aria-current={active ? "page" : undefined}
                    title={label}
                    className={`font-bengali flex h-10 w-10 items-center justify-center rounded-lg text-base font-semibold transition sm:h-9 sm:w-9 ${
                      active
                        ? "bg-emerald-700 text-white shadow"
                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                  >
                    {ch}
                  </Link>
                );
              })}
            </div>
          </nav>

          <DictionaryPosFilter
            active={pos}
            hrefs={{
              all: hrefFor({ page: 1, pos: [] }),
              n: hrefFor({ page: 1, pos: toggle(pos, "n") }),
              v: hrefFor({ page: 1, pos: toggle(pos, "v") }),
              a: hrefFor({ page: 1, pos: toggle(pos, "a") }),
              r: hrefFor({ page: 1, pos: toggle(pos, "r") }),
            }}
          />

          <DictionaryLetterMeta
            letter={browse.data.letter}
            count={browse.data.total}
            page={Math.min(browse.data.page, browse.data.totalPages)}
            totalPages={browse.data.totalPages}
          />

          {browse.data.items.length === 0 ? (
            <DictionaryEmpty />
          ) : (
            <div className="space-y-4">
              {browse.data.items.map((entry) => (
                <EntryCard key={entry.id} entry={entry} showIds={showIds} />
              ))}
            </div>
          )}

          <Pagination
            page={Math.min(browse.data.page, browse.data.totalPages)}
            totalPages={browse.data.totalPages}
            hrefFor={(p) => hrefFor({ page: p })}
          />
        </>
      )}
    </div>
  );
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
