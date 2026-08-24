"use client";

import { useI18n } from "@/lib/i18n";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function ChangePasswordPageContent({
  mustChange,
  minLength,
}: {
  mustChange: boolean;
  minLength: number;
}) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {mustChange ? t("setNewPassword") : t("changeYourPassword")}
      </h1>
      {mustChange ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          {t("firstLoginBanner")}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {t("changePasswordIntro")}
        </p>
      )}
      <div className="mt-8">
        <ChangePasswordForm minLength={minLength} firstLogin={mustChange} />
      </div>
    </div>
  );
}
