"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { ContributeForm } from "./ContributeForm";
import { ContributeSteps } from "./ContributeSteps";

export function ContributePageContent() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
        {t("joinBenLkc")}
      </p>
      <h1 className="mt-2 text-[clamp(1.5rem,4vw,2rem)] font-bold tracking-tight text-slate-900">
        {t("applyTitle")}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
        {t("applyIntro")}
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            {t("howJoiningWorks")}
          </h2>
          <ContributeSteps />

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-800">
              {t("alreadyHaveAccess")}
            </p>
            <p className="mt-1">
              {t("alreadyHaveAccessBefore")}{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-700 hover:underline"
              >
                {t("contributorLogin")}
              </Link>{" "}
              {t("alreadyHaveAccessMid")}{" "}
              <Link
                href="/forgot-password"
                className="font-semibold text-emerald-700 hover:underline"
              >
                {t("forgotPassword")}
              </Link>
              {t("alreadyHaveAccessAfter")}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:col-span-3">
          <h2 className="text-base font-bold text-slate-900">
            {t("requestFormTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{t("requestFormHint")}</p>
          <div className="mt-5">
            <ContributeForm />
          </div>
        </div>
      </div>
    </div>
  );
}
