"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { SearchBox } from "./SearchBox";

export function HomeHero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-700 text-white">
      {/* decorative Bengali letters — scale down on small screens */}
      <div
        aria-hidden
        className="font-bengali pointer-events-none absolute inset-0 select-none opacity-[0.06]"
      >
        <span className="absolute -top-8 left-[6%] text-[clamp(4rem,18vw,11rem)]">
          ক
        </span>
        <span className="absolute top-16 right-[8%] text-[clamp(3.5rem,14vw,9rem)] sm:top-24">
          ভ
        </span>
        <span className="absolute bottom-0 left-[38%] hidden text-[10rem] sm:block">
          শ
        </span>
        <span className="absolute -bottom-10 right-[30%] hidden text-[8rem] md:block">
          ঐ
        </span>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 md:py-28">
        <p className="font-bengali text-base font-medium text-emerald-200 sm:text-lg">
          বাংলা লোকাল নলেজ কোর
        </p>
        <h1 className="mt-3 max-w-3xl text-[clamp(1.75rem,5vw,3.25rem)] font-extrabold leading-[1.15] tracking-tight">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-[clamp(0.95rem,2.4vw,1.125rem)] leading-relaxed text-emerald-100 sm:mt-5">
          {t("heroSubtitle")}
        </p>

        <div className="mt-8 max-w-2xl sm:mt-10">
          <SearchBox large />
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            href="/dictionary"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-600/30 px-5 py-2.5 text-center font-semibold text-white backdrop-blur transition hover:bg-emerald-600/50"
          >
            {t("browseDictionary")} →
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2.5 text-center font-semibold text-emerald-200 underline-offset-4 transition hover:text-white hover:underline"
          >
            {t("becomeContributor")}
          </Link>
        </div>
      </div>
    </section>
  );
}
