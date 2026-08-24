"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";

const PIPE_KEYS = [
  { stepEn: "1", stepBn: "১", title: "pipe1Title", role: "pipe1Role", text: "pipe1Text" },
  { stepEn: "2", stepBn: "২", title: "pipe2Title", role: "pipe2Role", text: "pipe2Text" },
  { stepEn: "3", stepBn: "৩", title: "pipe3Title", role: "pipe3Role", text: "pipe3Text" },
  { stepEn: "4", stepBn: "৪", title: "pipe4Title", role: "pipe4Role", text: "pipe4Text" },
  { stepEn: "5", stepBn: "৫", title: "pipe5Title", role: "pipe5Role", text: "pipe5Text" },
] as const;

export function HomeBody({
  counters,
}: {
  counters: { key: string; value: number }[];
}) {
  const { t, lang } = useI18n();
  const counterLabels: Record<string, string> = {
    entries: t("lexicalEntries"),
    senses: t("senses"),
    synsets: t("synsets"),
    relations: t("relations"),
  };

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden sm:grid-cols-4">
          {counters.map((c) => (
            <div key={c.key} className="px-3 py-6 text-center sm:px-6 sm:py-8">
              <p className="text-[clamp(1.35rem,4.5vw,2.25rem)] font-extrabold tabular-nums text-emerald-800">
                {formatNumber(c.value)}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
                {counterLabels[c.key] ?? c.key}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
          <div>
            <h2 className="text-[clamp(1.35rem,3.5vw,1.875rem)] font-bold tracking-tight text-slate-900">
              {t("homeMissionTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              {t("homeMissionP1")}
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              {t("homeMissionP2")}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/about"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                {t("learnMore")}
              </Link>
              <Link
                href="/dictionary"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t("exploreLexicon")}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="font-bengali rounded-2xl bg-emerald-50 px-4 py-3 text-xl font-bold text-emerald-900 ring-1 ring-emerald-200 sm:px-5 sm:text-2xl">
                  গাংচিল
                </div>
                <div className="text-sm text-slate-400">{t("wordLabel")}</div>
              </div>
              <div className="ml-4 h-6 w-px bg-slate-300 sm:ml-6" />
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 ring-1 ring-sky-200 sm:px-5">
                  Synset <span className="font-mono text-xs">ben-syn442834</span>
                </div>
                <div className="text-sm text-slate-400">
                  {t("sharedMeaning")}
                </div>
              </div>
              <div className="ml-4 h-6 w-px bg-slate-300 sm:ml-6" />
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 ring-1 ring-violet-200 sm:px-5">
                  ILI <span className="font-mono text-xs">01605630-n</span>
                </div>
                <div className="text-sm text-slate-400">
                  {t("universalConcept")}
                </div>
              </div>
              <p className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                {t("illustrationNote")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-[clamp(1.35rem,3.5vw,1.875rem)] font-bold tracking-tight text-slate-900">
            {t("howPipelineWorks")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-500">
            {t("pipelineIntro")}
          </p>
          <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5">
            {PIPE_KEYS.map((p, i) => (
              <div key={p.title} className="relative">
                {i < PIPE_KEYS.length - 1 ? (
                  <div className="absolute top-7 left-[60%] hidden h-px w-[80%] bg-gradient-to-r from-emerald-300 to-transparent lg:block" />
                ) : null}
                <div className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition hover:border-emerald-300 hover:bg-white hover:shadow-md">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-bold text-white shadow-sm ${
                      lang === "bn" ? "font-bengali" : ""
                    }`}
                  >
                    {lang === "bn" ? p.stepBn : p.stepEn}
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    {t(p.title)}
                  </h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    {t(p.role)}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {t(p.text)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-4 py-12 text-center text-white sm:py-14">
        <h2 className="font-bengali text-[clamp(1.5rem,5vw,1.875rem)] font-bold">
          {t("ctaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-emerald-100">
          {t("ctaSubtitle")}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/contribute"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-7 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-emerald-50"
          >
            {t("mailToContribute")}
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/40 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            {t("loginAsContributor")}
          </Link>
        </div>
      </section>
    </>
  );
}
