"use client";

/**
 * Lightweight English / Bengali UI internationalisation (SRS §12.4).
 * The selected language is persisted in localStorage and toggled from
 * the site header.
 */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type UiLanguage = "en" | "bn";

const STRINGS: Record<string, { en: string; bn: string }> = {
  appName: { en: "Bengali LKC", bn: "বাংলা এলকেসি" },
  appTagline: {
    en: "Bengali Local Knowledge Core — Bengali Lexicon",
    bn: "বাংলা লোকাল নলেজ কোর — বাংলা অভিধান",
  },
  login: { en: "Login", bn: "লগইন" },
  logout: { en: "Logout", bn: "লগআউট" },
  dashboard: { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  dictionary: { en: "Dictionary", bn: "অভিধান" },
  search: { en: "Search", bn: "অনুসন্ধান" },
  wordSearch: { en: "Word Search", bn: "শব্দ অনুসন্ধান" },
  glossSearch: { en: "Gloss Search", bn: "সংজ্ঞা অনুসন্ধান" },
  statistics: { en: "Statistics", bn: "পরিসংখ্যান" },
  about: { en: "About", bn: "পরিচিতি" },
  heroTitle: {
    en: "Crowdsourcing the Bengali Lexicon",
    bn: "বাংলা শব্দভাণ্ডারের ক্রাউডসোর্সিং",
  },
  heroSubtitle: {
    en: "A role-based platform for lexical data entry, multi-tier validation and UKC-compatible export — building the Bengali Local Knowledge Core, one word at a time.",
    bn: "শব্দ সংযোজন, বহুস্তর যাচাই এবং ইউকেসি-সামঞ্জস্যপূর্ণ রপ্তানির জন্য ভূমিকা-ভিত্তিক প্ল্যাটফর্ম — একটি একটি শব্দে গড়ে উঠছে বাংলা লোকাল নলেজ কোর।",
  },
  searchPlaceholder: {
    en: "Search a Bengali word… (e.g. গাংচিল)",
    bn: "বাংলা শব্দ খুঁজুন… (যেমন: গাংচিল)",
  },
  browseDictionary: { en: "Browse the Dictionary", bn: "অভিধান ব্রাউজ করুন" },
  lexicalEntries: { en: "Lexical Entries", bn: "শব্দভুক্তি" },
  senses: { en: "Word Senses", bn: "শব্দার্থ" },
  synsets: { en: "Synsets (Concepts)", bn: "সিনসেট (ধারণা)" },
  relations: { en: "Semantic Relations", bn: "অর্থগত সম্পর্ক" },
  howItWorks: { en: "How the pipeline works", bn: "যেভাবে কাজ করে" },
  becomeContributor: {
    en: "Become a Contributor",
    bn: "অবদানকারী হোন",
  },
  noResults: { en: "No results found", bn: "কোনো ফলাফল পাওয়া যায়নি" },
  definition: { en: "Definition", bn: "সংজ্ঞা" },
  showDetails: { en: "Show Details", bn: "বিস্তারিত দেখুন" },
  exactMatch: { en: "Exact match", bn: "সম্পূর্ণ মিল" },
  prefixMatch: { en: "Prefix match", bn: "আংশিক মিল" },
  partOfSpeech: { en: "Part of Speech", bn: "পদ" },
  welcomeBack: { en: "Welcome back", bn: "স্বাগতম" },
};

interface I18nContextShape {
  lang: UiLanguage;
  setLang: (l: UiLanguage) => void;
  t: (key: keyof typeof STRINGS | string) => string;
}

const I18nContext = createContext<I18nContextShape>({
  lang: "en",
  setLang: () => {},
  t: (k) => String(k),
});

function readSavedLang(): UiLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("lkc-lang");
  return saved === "bn" || saved === "en" ? saved : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLanguage>(readSavedLang);

  const setLang = useCallback((l: UiLanguage) => {
    setLangState(l);
    window.localStorage.setItem("lkc-lang", l);
  }, []);

  const t = useCallback(
    (key: string) => STRINGS[key]?.[lang] ?? key,
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextShape {
  return useContext(I18nContext);
}
