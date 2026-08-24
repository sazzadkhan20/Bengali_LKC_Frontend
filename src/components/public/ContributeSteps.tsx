"use client";

import { useI18n } from "@/lib/i18n";

const STEPS = [
  {
    en: "1",
    bn: "১",
    title: { en: "Tell us about yourself", bn: "নিজের সম্পর্কে জানান" },
    text: {
      en: "Submit the form with your contact details and why you want to help build the Bengali lexicon.",
      bn: "যোগাযোগের তথ্য এবং বাংলা অভিধান গড়তে আপনি কেন সাহায্য করতে চান তা ফর্মে লিখুন।",
    },
  },
  {
    en: "2",
    bn: "২",
    title: { en: "Architect review", bn: "আর্কিটেক্টের পর্যালোচনা" },
    text: {
      en: "The Platform Architect reviews every request. Accounts are never self-registered — credentials are issued by invitation only.",
      bn: "প্ল্যাটফর্ম আর্কিটেক্ট প্রতিটি আবেদন পর্যালোচনা করেন। নিজে অ্যাকাউন্ট তৈরি করা যায় না — শুধু আমন্ত্রণে শংসাপত্র দেওয়া হয়।",
    },
  },
  {
    en: "3",
    bn: "৩",
    title: { en: "Receive credentials", bn: "শংসাপত্র গ্রহণ" },
    text: {
      en: "If approved, you get a username and one-time password by email. Change it at first login, then start contributing.",
      bn: "অনুমোদিত হলে ইমেইলে ব্যবহারকারী নাম ও একবার ব্যবহারযোগ্য পাসওয়ার্ড পাবেন। প্রথম লগইনে পাসওয়ার্ড পরিবর্তন করে অবদান শুরু করুন।",
    },
  },
  {
    en: "4",
    bn: "৪",
    title: { en: "Contribute & validate", bn: "অবদান ও যাচাই" },
    text: {
      en: "Enter words via Quick Input, review entries, or join arbitration — depending on the role you are assigned.",
      bn: "নির্ধারিত ভূমিকা অনুযায়ী Quick Input-এ শব্দ যোগ করুন, এন্ট্রি যাচাই করুন অথবা সালিশে অংশ নিন।",
    },
  },
] as const;

export function ContributeSteps() {
  const { lang } = useI18n();

  return (
    <ol className="mt-4 space-y-4">
      {STEPS.map((s) => (
        <li key={s.en} className="flex gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white ${
              lang === "bn" ? "font-bengali" : ""
            }`}
          >
            {lang === "bn" ? s.bn : s.en}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800">{s.title[lang]}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {s.text[lang]}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
