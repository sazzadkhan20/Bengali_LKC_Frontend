"use client";

import Link from "next/link";
import type { LexicalEntry } from "@/lib/types";
import { entriesBySynset, senseById, synsetById } from "@/lib/lexicon";
import { REL_LABEL } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { WordLink } from "@/components/WordLink";
import { LocalizedPosBadge } from "@/components/LocalizedPosBadge";
import { IdChip, LangBadge } from "./ui";

/**
 * Dictionary entry card (SRS §8.1.2). When `showIds` is false (Visitor
 * tier) internal IDs and ILI codes are hidden and relations are shown
 * by target word form only.
 */
export function EntryCard({
  entry,
  showIds,
  compact = false,
  detailPage = false,
}: {
  entry: LexicalEntry;
  showIds: boolean;
  compact?: boolean;
  /** True on `/word/[id]` — hides the redundant self-link control. */
  detailPage?: boolean;
}) {
  const { t } = useI18n();
  const firstSynset = entry.senses[0]
    ? synsetById.get(entry.senses[0].synset)
    : undefined;
  const previewDefinition = firstSynset?.definition?.text;

  const cardClassName =
    "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5";

  const header = (
    <header className="flex flex-wrap items-center gap-2 sm:gap-3">
      {detailPage ? (
        <h1 className="font-bengali text-[clamp(1.35rem,4vw,1.75rem)] font-bold text-slate-900">
          {entry.lemma}
        </h1>
      ) : compact ? (
        // Compact cards wrap the whole surface in one WordLink — keep the
        // lemma as text so we never nest <a> inside <a>.
        <h2 className="font-bengali text-[clamp(1.35rem,4vw,1.75rem)] font-bold text-slate-900 group-hover:text-emerald-700">
          {entry.lemma}
        </h2>
      ) : (
        <WordLink
          href={`/word/${entry.id}`}
          className="font-bengali text-[clamp(1.35rem,4vw,1.75rem)] font-bold text-slate-900 hover:text-emerald-700"
        >
          {entry.lemma}
        </WordLink>
      )}
      <LocalizedPosBadge pos={entry.pos} />
      {showIds ? <IdChip id={entry.id} /> : null}
      {entry.senses.length > 1 ? (
        <span className="text-xs font-medium text-slate-400">
          {entry.senses.length} {t("sensesPolysemous")}
        </span>
      ) : null}
      {!detailPage ? (
        <span className="w-full text-xs font-semibold text-emerald-700 group-hover:underline sm:ml-auto sm:w-auto">
          {t("showDetails")}
        </span>
      ) : null}
    </header>
  );

  const senseSections = (
    <div className="mt-4 space-y-4">
        {entry.senses.map((sense, idx) => {
          const synset = synsetById.get(sense.synset);
          const synonyms = (entriesBySynset.get(sense.synset) ?? []).filter(
            (e) => e.id !== entry.id
          );
          return (
            <div
              key={sense.id}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">
                  {t("senseN")} {idx + 1}
                </span>
                {showIds ? (
                  <>
                    <IdChip id={sense.id} />
                    <span>→</span>
                    <Link href={`/synset/${sense.synset}`}>
                      <IdChip id={sense.synset} />
                    </Link>
                    {synset ? (
                      <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                        ILI {synset.ili}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>

              {synset?.definition ? (
                <p className="font-bengali mt-2 text-sm leading-relaxed text-slate-700">
                  <LangBadge lang={synset.definition.language} />{" "}
                  {synset.definition.text}
                </p>
              ) : (
                <p className="mt-2 text-xs italic text-slate-400">
                  {t("noDefinitionYet")}
                </p>
              )}

              {synonyms.length > 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-semibold">{t("synonyms")}:</span>{" "}
                  {synonyms.slice(0, 8).map((s, i) => (
                    <span key={s.id}>
                      {i > 0 ? ", " : ""}
                      <WordLink
                        href={`/word/${s.id}`}
                        className="font-bengali text-sm text-emerald-700 hover:underline"
                      >
                        {s.lemma}
                      </WordLink>
                    </span>
                  ))}
                  {synonyms.length > 8
                    ? ` +${synonyms.length - 8} ${t("more")}`
                    : ""}
                </p>
              ) : null}

              {!compact && sense.relations && sense.relations.length > 0 ? (
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {t("senseRelations")}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {sense.relations.map((rel, i) => {
                      const target = senseById.get(rel.target);
                      return (
                        <li
                          key={`${rel.target}-${i}`}
                          className="flex flex-wrap items-center gap-2 text-xs text-slate-600"
                        >
                          <span className="rounded bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-slate-200">
                            {REL_LABEL[rel.relType] ?? rel.relType}
                          </span>
                          {target ? (
                            <WordLink
                              href={`/word/${target.entry.id}`}
                              className="font-bengali text-sm font-semibold text-emerald-700 hover:underline"
                            >
                              {target.entry.lemma}
                            </WordLink>
                          ) : (
                            <span className="italic text-slate-400">
                              {t("externalSense")}
                            </span>
                          )}
                          {showIds ? <IdChip id={rel.target} /> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {!compact && synset?.relations && synset.relations.length > 0 ? (
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {t("synsetRelations")}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {synset.relations.map((rel, i) => {
                      const targetSynset = synsetById.get(rel.target);
                      const targetWords = entriesBySynset.get(rel.target) ?? [];
                      return (
                        <li
                          key={`${rel.target}-${i}`}
                          className="flex flex-wrap items-center gap-2 text-xs text-slate-600"
                        >
                          <span className="rounded bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-slate-200">
                            {REL_LABEL[rel.relType] ?? rel.relType}
                          </span>
                          {targetWords.length > 0 ? (
                            targetWords.slice(0, 4).map((w, j) => (
                              <WordLink
                                key={w.id}
                                href={`/word/${w.id}`}
                                className="font-bengali text-sm font-semibold text-emerald-700 hover:underline"
                              >
                                {w.lemma}
                                {j < Math.min(targetWords.length, 4) - 1 ? "," : ""}
                              </WordLink>
                            ))
                          ) : (
                            <span className="italic text-slate-400">
                              (lexical gap)
                            </span>
                          )}
                          {showIds ? (
                            <Link href={`/synset/${rel.target}`}>
                              <IdChip id={rel.target} />
                            </Link>
                          ) : null}
                          {targetSynset?.definition && !compact ? (
                            <span className="w-full pl-1 text-[11px] italic text-slate-400">
                              {targetSynset.definition.text.slice(0, 90)}
                              {targetSynset.definition.text.length > 90 ? "…" : ""}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
  );

  if (compact && !detailPage) {
    return (
      <WordLink
        href={`/word/${entry.id}`}
        className={`group block ${cardClassName}`}
      >
        {header}
        {previewDefinition ? (
          <p className="font-bengali mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {previewDefinition}
          </p>
        ) : (
          <p className="mt-3 text-xs italic text-slate-400">
            No definition recorded — open for full entry.
          </p>
        )}
      </WordLink>
    );
  }

  return (
    <article className={cardClassName}>
      {header}
      {senseSections}
    </article>
  );
}
