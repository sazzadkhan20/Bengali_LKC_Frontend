"use client";

import Link from "next/link";
import type { EntryCardData, WordDetail } from "@/lib/lexicon-api";
import { REL_LABEL } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { WordLink } from "@/components/WordLink";
import { LocalizedPosBadge } from "@/components/LocalizedPosBadge";
import { CrowdsourcedBadge, ValidatedNote } from "@/components/public/LexiconBits";
import { IdChip, LangBadge } from "./ui";

const CARD =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5";

/**
 * Compact dictionary card (SRS §8.1.1). The whole surface links to the word
 * page; internal IDs are only shown to signed-in users.
 */
export function EntryCard({
  entry,
  showIds,
}: {
  entry: EntryCardData;
  showIds: boolean;
}) {
  const { t } = useI18n();
  return (
    <WordLink href={`/word/${entry.id}`} className={`group block ${CARD}`}>
      <header className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h2 className="font-bengali min-w-0 break-words text-[clamp(1.35rem,4vw,1.75rem)] font-bold text-slate-900 group-hover:text-emerald-700">
          {entry.lemma}
        </h2>
        <LocalizedPosBadge pos={entry.pos} />
        {entry.crowdsourced ? <CrowdsourcedBadge validatedAt={entry.validatedAt} /> : null}
        {showIds ? <IdChip id={entry.id} /> : null}
        {entry.senseCount > 1 ? (
          <span className="text-xs font-medium text-slate-400">
            {entry.senseCount} {t("sensesPolysemous")}
          </span>
        ) : null}
        <span className="w-full text-xs font-semibold text-emerald-700 group-hover:underline sm:ml-auto sm:w-auto">
          {t("showDetails")}
        </span>
      </header>
      {entry.definition ? (
        <p className="font-bengali mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {entry.definition}
        </p>
      ) : (
        <p className="mt-3 text-xs italic text-slate-400">{t("noDefinitionYet")}</p>
      )}
    </WordLink>
  );
}

/** Full entry on `/word/[id]` (SRS §8.1.2): every sense with synonyms and relations. */
export function WordEntryDetail({
  word,
  showIds,
}: {
  word: WordDetail;
  showIds: boolean;
}) {
  const { t } = useI18n();
  return (
    <article className={CARD}>
      <header className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="font-bengali min-w-0 break-words text-[clamp(1.35rem,4vw,1.75rem)] font-bold text-slate-900">
          {word.lemma}
        </h1>
        <LocalizedPosBadge pos={word.pos} />
        {word.crowdsourced ? <CrowdsourcedBadge validatedAt={word.validatedAt} size="md" /> : null}
        {showIds ? <IdChip id={word.id} /> : null}
        {word.senses.length > 1 ? (
          <span className="text-xs font-medium text-slate-400">
            {word.senses.length} {t("sensesPolysemous")}
          </span>
        ) : null}
        {word.crowdsourced ? (
          <span className="w-full sm:ml-auto sm:w-auto">
            <ValidatedNote validatedAt={word.validatedAt} />
          </span>
        ) : null}
      </header>

      <div className="mt-4 space-y-4">
        {word.senses.map((sense, idx) => (
          <section
            key={sense.id}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">
                {t("senseN")} {idx + 1}
              </span>
              {sense.crowdsourced && !word.crowdsourced ? (
                <CrowdsourcedBadge validatedAt={sense.validatedAt} />
              ) : null}
              {sense.newSynset ? (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 ring-1 ring-inset ring-sky-200">
                  {t("newConcept")}
                </span>
              ) : null}
              {showIds ? (
                <>
                  <IdChip id={sense.id} />
                  <span aria-hidden>→</span>
                  <Link href={`/synset/${sense.synsetId}`}>
                    <IdChip id={sense.synsetId} />
                  </Link>
                  <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-inset ring-violet-200">
                    ILI {sense.ili}
                  </span>
                </>
              ) : null}
            </div>

            {sense.definition ? (
              <p className="font-bengali mt-2 text-sm leading-relaxed text-slate-700">
                <LangBadge lang={sense.definition.language} /> {sense.definition.text}
              </p>
            ) : (
              <p className="mt-2 text-xs italic text-slate-400">{t("noDefinitionYet")}</p>
            )}

            {sense.synonyms.length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-semibold">{t("synonyms")}:</span>{" "}
                {sense.synonyms.map((s, i) => (
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
                {sense.synonymCount > sense.synonyms.length
                  ? ` ${t("synonymsMore").replace("{n}", String(sense.synonymCount - sense.synonyms.length))}`
                  : ""}
              </p>
            ) : null}

            {sense.senseRelations.length > 0 ? (
              <div className="mt-3 border-t border-slate-100 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {t("senseRelations")}
                </p>
                <ul className="mt-1 space-y-1">
                  {sense.senseRelations.map((rel, i) => (
                    <li
                      key={`${rel.target}-${i}`}
                      className="flex flex-wrap items-center gap-2 text-xs text-slate-600"
                    >
                      <span className="rounded bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-slate-200">
                        {REL_LABEL[rel.relType] ?? rel.relType}
                      </span>
                      {rel.targetEntryId && rel.targetLemma ? (
                        <WordLink
                          href={`/word/${rel.targetEntryId}`}
                          className="font-bengali text-sm font-semibold text-emerald-700 hover:underline"
                        >
                          {rel.targetLemma}
                        </WordLink>
                      ) : (
                        <span className="italic text-slate-400">{t("externalSense")}</span>
                      )}
                      {showIds ? <IdChip id={rel.target} /> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {sense.synsetRelations.length > 0 ? (
              <div className="mt-3 border-t border-slate-100 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {t("synsetRelations")}
                </p>
                <ul className="mt-1 space-y-1.5">
                  {sense.synsetRelations.map((rel, i) => (
                    <li
                      key={`${rel.target}-${i}`}
                      className="flex flex-wrap items-center gap-2 text-xs text-slate-600"
                    >
                      <span className="rounded bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-slate-200">
                        {REL_LABEL[rel.relType] ?? rel.relType}
                      </span>
                      {rel.words.length > 0 ? (
                        rel.words.map((w, j) => (
                          <WordLink
                            key={w.id}
                            href={`/word/${w.id}`}
                            className="font-bengali text-sm font-semibold text-emerald-700 hover:underline"
                          >
                            {w.lemma}
                            {j < rel.words.length - 1 ? "," : ""}
                          </WordLink>
                        ))
                      ) : (
                        <span className="italic text-slate-400">{t("lexicalGap")}</span>
                      )}
                      {showIds ? (
                        <Link href={`/synset/${rel.target}`}>
                          <IdChip id={rel.target} />
                        </Link>
                      ) : null}
                      {rel.definition ? (
                        <span className="w-full pl-1 text-[11px] italic text-slate-400">
                          {rel.definition}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
