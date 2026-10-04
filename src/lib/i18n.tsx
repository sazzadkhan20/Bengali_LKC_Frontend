"use client";

/**
 * English / Bengali UI internationalisation (SRS §12.4).
 * Technical terms (ILI, synset, UKC, LMF, XML, role codes, lifecycle
 * state names) stay in Latin script so contributors keep a shared
 * vocabulary; everyday chrome is translated.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type UiLanguage = "en" | "bn";

export const STRINGS = {
  appName: { en: "Bengali LKC", bn: "বাংলা এলকেসি" },
  appTagline: {
    en: "Bengali Local Knowledge Core — Bengali Lexicon",
    bn: "বাংলা লোকাল নলেজ কোর — বাংলা অভিধান",
  },
  login: { en: "Login", bn: "লগইন" },
  logout: { en: "Logout", bn: "লগআউট" },
  dashboard: { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  dictionary: { en: "Dictionary", bn: "অভিধান" },
  dictionaryBrowse: { en: "Dictionary Browse", bn: "অভিধান ব্রাউজ" },
  search: { en: "Search", bn: "অনুসন্ধান" },
  wordSearch: { en: "Word Search", bn: "শব্দ অনুসন্ধান" },
  glossSearch: { en: "Gloss Search", bn: "সংজ্ঞা অনুসন্ধান" },
  statistics: { en: "Statistics", bn: "পরিসংখ্যান" },
  about: { en: "About", bn: "পরিচিতি" },
  aboutProject: { en: "About the Project", bn: "প্রকল্প সম্পর্কে" },
  contribute: { en: "Apply to Contribute", bn: "অবদানের আবেদন" },
  heroTitle: {
    en: "Crowdsourcing the Bengali Lexicon",
    bn: "বাংলা শব্দভাণ্ডারের ক্রাউডসোর্সিং",
  },
  heroSubtitle: {
    en: "A role-based platform for lexical data entry, multi-tier validation and UKC-compatible export — building the Bengali Local Knowledge Core, one word at a time.",
    bn: "শব্দ সংযোজন, বহুস্তর যাচাই এবং UKC-সামঞ্জস্যপূর্ণ রপ্তানির জন্য ভূমিকাভিত্তিক প্ল্যাটফর্ম — একটি একটি শব্দে গড়ে উঠছে বাংলা লোকাল নলেজ কোর।",
  },
  heroBrandBn: {
    en: "বাংলা লোকাল নলেজ কোর",
    bn: "বাংলা লোকাল নলেজ কোর",
  },
  searchPlaceholder: {
    en: "Search a Bengali word… (e.g. গাংচিল)",
    bn: "বাংলা শব্দ খুঁজুন… (যেমন: গাংচিল)",
  },
  browseDictionary: { en: "Browse the Dictionary", bn: "অভিধান ব্রাউজ করুন" },
  lexicalEntries: { en: "Lexical Entries", bn: "শব্দভুক্তি" },
  senses: { en: "Word Senses", bn: "শব্দার্থ" },
  synsets: { en: "Synsets (Concepts)", bn: "Synset (ধারণা)" },
  relations: { en: "Semantic Relations", bn: "অর্থগত সম্পর্ক" },
  howItWorks: { en: "How the pipeline works", bn: "যাচাই প্রক্রিয়া যেভাবে কাজ করে" },
  becomeContributor: { en: "Log in", bn: "লগইন করুন" },
  mailToContribute: { en: "Apply to Contribute", bn: "অবদানের আবেদন করুন" },
  noResults: { en: "No results found", bn: "কোনো ফলাফল পাওয়া যায়নি" },
  definition: { en: "Definition", bn: "সংজ্ঞা" },
  showDetails: { en: "Show Details →", bn: "বিস্তারিত দেখুন →" },
  exactMatch: { en: "Exact match", bn: "সম্পূর্ণ মিল" },
  prefixMatch: { en: "Prefix match", bn: "আংশিক মিল" },
  partOfSpeech: { en: "Part of Speech", bn: "পদ" },
  welcomeBack: { en: "Welcome back", bn: "স্বাগতম" },
  explore: { en: "Explore", bn: "অন্বেষণ" },
  contributeSection: { en: "Contribute", bn: "অবদান" },
  footerBlurb: {
    en: "A role-based crowdsourcing framework for Bengali lexical data entry, validation and UKC-compatible LMF XML export.",
    bn: "বাংলা শব্দ তথ্য সংযোজন, যাচাই এবং UKC-সামঞ্জস্যপূর্ণ LMF XML রপ্তানির জন্য ভূমিকাভিত্তিক ক্রাউডসোর্সিং কাঠামো।",
  },
  footerCredit: {
    en: "Bengali LKC Development Team · Based on the UKC lexicon",
    bn: "বাংলা এলকেসি ডেভেলপমেন্ট টিম · UKC অভিধানের ভিত্তিতে",
  },
  contributorLogin: { en: "Contributor Login", bn: "অবদানকারী লগইন" },
  roleDashboards: { en: "Role Dashboards", bn: "ভূমিকাভিত্তিক ড্যাশবোর্ড" },
  openMenu: { en: "Open menu", bn: "মেনু খুলুন" },
  closeMenu: { en: "Close menu", bn: "মেনু বন্ধ করুন" },
  language: { en: "Language", bn: "ভাষা" },
  localKnowledgeCore: {
    en: "Local Knowledge Core",
    bn: "লোকাল নলেজ কোর",
  },

  /* Home */
  homeMissionTitle: {
    en: "From local words to universal concepts",
    bn: "স্থানীয় শব্দ থেকে সার্বজনীন ধারণায়",
  },
  homeMissionP1: {
    en: "The Universal Knowledge Core (UKC) maps the vocabularies of 335 languages onto a single language-independent concept space. Bengali — spoken by over 230 million people — currently lexicalises only a fraction of those concepts.",
    bn: "Universal Knowledge Core (UKC) ৩৩৫টি ভাষার শব্দভাণ্ডারকে একটি ভাষা-নিরপেক্ষ ধারণা জগতে মিলিয়ে রাখে। প্রায় ২৩ কোটি মানুষের ভাষা বাংলা এখনও সেই ধারণাগুলোর সামান্য অংশই শব্দভুক্ত করেছে।",
  },
  homeMissionP2: {
    en: "The Bengali LKC closes that gap through structured crowdsourcing: every submitted word is linked to a concept via its Inter-Lingual Index (ILI) code, validated by a three-tier editorial pipeline, and exported back to the UKC as standards-compliant LMF XML.",
    bn: "বাংলা এলকেসি কাঠামোবদ্ধ ক্রাউডসোর্সিংয়ের মাধ্যমে সেই ফাঁক পূরণ করে: প্রতিটি জমা দেওয়া শব্দ ILI কোডের মাধ্যমে ধারণার সাথে যুক্ত হয়, তিন স্তরের সম্পাদনা প্রক্রিয়ায় যাচাই হয়, এবং মানসম্মত LMF XML হিসেবে UKC-তে রপ্তানি হয়।",
  },
  learnMore: { en: "Learn more", bn: "আরও জানুন" },
  exploreLexicon: { en: "Explore the lexicon", bn: "অভিধান দেখুন" },
  wordLabel: { en: "word · noun", bn: "শব্দ · বিশেষ্য" },
  sharedMeaning: {
    en: "shared meaning in Bengali",
    bn: "বাংলায় ভাগ করা অর্থ",
  },
  universalConcept: {
    en: "universal concept — “seagull”",
    bn: "সার্বজনীন ধারণা — “গাংচিল / seagull”",
  },
  illustrationNote: {
    en: "Words are language-specific; concepts are universal. The ILI code anchors every Bengali synset to the UKC Concept Core, making the lexicon interoperable with hundreds of other languages.",
    bn: "শব্দ ভাষা-নির্দিষ্ট; ধারণা সার্বজনীন। ILI কোড প্রতিটি বাংলা synset-কে UKC Concept Core-এর সাথে বাঁধে, ফলে অভিধান শত শত অন্য ভাষার সাথে আন্তঃকার্যকর হয়।",
  },
  pipelineIntro: {
    en: "Seven roles, nine lifecycle states, one auditable path from a contributor's draft to the Universal Knowledge Core.",
    bn: "সাতটি ভূমিকা, নয়টি জীবনচক্র অবস্থা — অবদানকারীর খসড়া থেকে Universal Knowledge Core পর্যন্ত একটি নিরীক্ষণযোগ্য পথ।",
  },
  ctaTitle: {
    en: "আপনার ভাষা, আপনার অবদান",
    bn: "আপনার ভাষা, আপনার অবদান",
  },
  ctaSubtitle: {
    en: "Your language, your contribution. Join the crowdsourcing effort and help Bengali take its full place in the Universal Knowledge Core.",
    bn: "আপনার ভাষা, আপনার অবদান। ক্রাউডসোর্সিংয়ে যোগ দিন এবং বাংলাকে Universal Knowledge Core-এ তার পূর্ণ স্থান দিতে সাহায্য করুন।",
  },
  loginAsContributor: {
    en: "Login as a Contributor",
    bn: "অবদানকারী হিসেবে লগইন",
  },

  /* Pipeline steps */
  pipe1Title: { en: "Submit", bn: "জমা দিন" },
  pipe1Role: { en: "Lexical Contributor", bn: "Lexical Contributor" },
  pipe1Text: {
    en: "A contributor enters a Bengali word with its part of speech, concept (synset) linkage and definition through the Quick Input form.",
    bn: "অবদানকারী Quick Input ফর্মের মাধ্যমে বাংলা শব্দ, পদ, ধারণা (synset) সংযোগ ও সংজ্ঞা জমা দেন।",
  },
  pipe2Title: { en: "Primary Validation", bn: "প্রাথমিক যাচাই" },
  pipe2Role: { en: "Lexical Editor", bn: "Lexical Editor" },
  pipe2Text: {
    en: "An editor checks structure and references — approving, flagging for correction, or rejecting with a mandatory reason.",
    bn: "সম্পাদক কাঠামো ও তথ্যসূত্র যাচাই করেন — অনুমোদন, সংশোধনের জন্য চিহ্নিতকরণ, অথবা বাধ্যতামূলক কারণসহ প্রত্যাখ্যান।",
  },
  pipe3Title: { en: "Linguistic Validation", bn: "ভাষাতাত্ত্বিক যাচাই" },
  pipe3Role: { en: "Chief Lexical Editor", bn: "Chief Lexical Editor" },
  pipe3Text: {
    en: "The Chief Lexical Editor performs the definitive linguistic review. Only this approval promotes an entry to VALIDATED.",
    bn: "Chief Lexical Editor চূড়ান্ত ভাষাতাত্ত্বিক পর্যালোচনা করেন। শুধু এই অনুমোদনেই এন্ট্রি VALIDATED হয়।",
  },
  pipe4Title: { en: "Arbitration", bn: "সালিশ" },
  pipe4Role: { en: "Arbitration Curators", bn: "Arbitration Curator" },
  pipe4Text: {
    en: "Disputes are resolved by a curator panel vote with a 2/3 quorum rule — binding, auditable and fair.",
    bn: "বিরোধ নিষ্পত্তি হয় কিউরেটর প্যানেলের ভোটে — ২/৩ কোরাম নিয়মে, বাধ্যতামূলক ও নিরীক্ষণযোগ্য।",
  },
  pipe5Title: { en: "Export to UKC", bn: "UKC-তে রপ্তানি" },
  pipe5Role: { en: "Architect / Moderator", bn: "Architect / Moderator" },
  pipe5Text: {
    en: "Validated entries are exported as UKC-compatible LMF XML and merged into the Universal Knowledge Core.",
    bn: "যাচাইকৃত এন্ট্রি UKC-সামঞ্জস্যপূর্ণ LMF XML হিসেবে রপ্তানি হয়ে Universal Knowledge Core-এ মিলিত হয়।",
  },

  /* Search */
  searchLexiconTitle: {
    en: "Search the Bengali Lexicon",
    bn: "বাংলা অভিধানে অনুসন্ধান",
  },
  searchLexiconAuth: {
    en: "Word, gloss, synset / ILI and sense ID search with full internal ID visibility.",
    bn: "শব্দ, সংজ্ঞা, synset / ILI এবং sense ID অনুসন্ধান — অভ্যন্তরীণ ID সহ।",
  },
  searchLexiconGuest: {
    en: "Word and gloss search over all validated entries. Log in for synset, ILI and sense ID search.",
    bn: "যাচাইকৃত এন্ট্রিতে শব্দ ও সংজ্ঞা অনুসন্ধান। synset, ILI ও sense ID অনুসন্ধানের জন্য লগইন করুন।",
  },
  tabWord: { en: "Word", bn: "শব্দ" },
  tabGloss: { en: "Gloss", bn: "সংজ্ঞা" },
  tabSynsetIli: { en: "Synset / ILI", bn: "Synset / ILI" },
  tabSenseId: { en: "Sense ID", bn: "Sense ID" },

  /* Dictionary */
  dictionaryTitle: { en: "Dictionary Browse", bn: "অভিধান ব্রাউজ" },
  dictionarySubtitle: {
    en: "Alphabetical browse of all validated entries, ordered by the Bengali Varnamala. Click any initial character to jump to that section.",
    bn: "বাংলা বর্ণমালা অনুসারে সাজানো যাচাইকৃত এন্ট্রি। যেকোনো বর্ণে ক্লিক করে সেই অংশে যান।",
  },
  entriesUnderLetter: {
    en: "entries under this letter",
    bn: "এই বর্ণের এন্ট্রি",
  },
  noEntriesLetter: {
    en: "No entries under this letter",
    bn: "এই বর্ণে কোনো এন্ট্রি নেই",
  },
  tryAnotherLetter: {
    en: "Try another character from the index bar above.",
    bn: "উপরের সূচি থেকে অন্য বর্ণ চেষ্টা করুন।",
  },
  prev: { en: "← Prev", bn: "← আগে" },
  next: { en: "Next →", bn: "পরে →" },

  /* Contribute */
  joinBenLkc: { en: "Join Ben-LKC", bn: "Ben-LKC-তে যোগ দিন" },
  applyTitle: { en: "Apply to Contribute", bn: "অবদানের আবেদন" },
  applyIntro: {
    en: "Want to help expand the Bengali Local Knowledge Core? There is no public sign-up. Use this form to request an invitation. We will email you if a contributor, editor, or curator seat is available.",
    bn: "বাংলা লোকাল নলেজ কোর সম্প্রসারণে সাহায্য করতে চান? জনসাধারণের জন্য খোলা নিবন্ধন নেই। আমন্ত্রণ চাইতে এই ফর্ম ব্যবহার করুন। আসন খালি থাকলে আমরা ইমেইল করব।",
  },
  howJoiningWorks: { en: "How joining works", bn: "যোগদান যেভাবে হয়" },
  alreadyHaveAccess: { en: "Already have access?", bn: "ইতিমধ্যে অ্যাক্সেস আছে?" },
  alreadyHaveAccessBefore: {
    en: "Go to",
    bn: "ইমেইলে পাওয়া শংসাপত্র দিয়ে",
  },
  alreadyHaveAccessMid: {
    en: "with the credentials emailed to you. Forgot your password? Use",
    bn: "যান। পাসওয়ার্ড ভুলে গেলে",
  },
  alreadyHaveAccessAfter: {
    en: ".",
    bn: " ব্যবহার করুন।",
  },
  forgotPassword: { en: "Forgot password", bn: "পাসওয়ার্ড ভুলে গেছি" },
  requestFormTitle: {
    en: "Contribution request form",
    bn: "অবদানের আবেদন ফর্ম",
  },
  requestFormHint: {
    en: "Fields marked * are required. We use your details only to contact you about Ben-LKC participation.",
    bn: "* চিহ্নিত ক্ষেত্র আবশ্যক। আপনার তথ্য শুধু Ben-LKC অংশগ্রহণের যোগাযোগের জন্য ব্যবহার করা হবে।",
  },
  fullName: { en: "Full name", bn: "পূর্ণ নাম" },
  email: { en: "Email", bn: "ইমেইল" },
  phone: { en: "Phone number", bn: "ফোন নম্বর" },
  institution: { en: "Institution / affiliation", bn: "প্রতিষ্ঠান / সংযুক্তি" },
  interestRole: { en: "Role you are interested in", bn: "আপনার আগ্রহের ভূমিকা" },
  whyJoin: { en: "Why do you want to join Ben-LKC?", bn: "কেন Ben-LKC-তে যোগ দিতে চান?" },
  submitRequest: {
    en: "Submit contribution request",
    bn: "আবেদন জমা দিন",
  },
  sending: { en: "Sending…", bn: "পাঠানো হচ্ছে…" },
  thankYouTitle: {
    en: "Thank you — we received your request",
    bn: "ধন্যবাদ — আপনার আবেদন পেয়েছি",
  },
  thankYouBody: {
    en: "The Platform Architect reviews every application. If you are selected, you will receive login credentials by email. You cannot create an account yourself — Ben-LKC is invitation-only.",
    bn: "Platform Architect প্রতিটি আবেদন পর্যালোচনা করেন। নির্বাচিত হলে ইমেইলে লগইন শংসাপত্র পাবেন। নিজে অ্যাকাউন্ট তৈরি করা যায় না — Ben-LKC শুধু আমন্ত্রণভিত্তিক।",
  },
  submitAnother: {
    en: "Submit another request",
    bn: "আরেকটি আবেদন পাঠান",
  },

  /* About */
  aboutTitle: { en: "About the Bengali LKC", bn: "বাংলা এলকেসি সম্পর্কে" },
  aboutP1: {
    en: "The Bengali Local Knowledge Core (Ben-LKC) is a role-based, web-accessible platform for crowdsourced lexical data entry, multi-tier validation, dispute resolution, and export of structured data fully compatible with the Universal Knowledge Core (UKC) Lexical Markup Framework (LMF) XML schema.",
    bn: "বাংলা লোকাল নলেজ কোর (Ben-LKC) একটি ভূমিকাভিত্তিক ওয়েব প্ল্যাটফর্ম — ক্রাউডসোর্সড শব্দ সংযোজন, বহুস্তর যাচাই, বিরোধ নিষ্পত্তি এবং Universal Knowledge Core (UKC) LMF XML স্কিমার সাথে সম্পূর্ণ সামঞ্জস্যপূর্ণ কাঠামোবদ্ধ তথ্য রপ্তানির জন্য।",
  },
  aboutP2: {
    en: "The UKC, developed at the University of Trento, is a large-scale multilingual lexico-semantic knowledge base extending the Princeton WordNet model with language-independent concepts spanning 335 languages. Bengali — despite its ~230 million native speakers — currently lexicalises only a small fraction of the UKC concept space. This platform exists to close that gap, one validated word at a time.",
    bn: "ইউনিভার্সিটি অব ট্রেন্টোতে উন্নীত UKC একটি বৃহৎ বহুভাষিক জ্ঞানভাণ্ডার, যা Princeton WordNet মডেলকে ৩৩৫টি ভাষার ভাষা-নিরপেক্ষ ধারণায় প্রসারিত করে। প্রায় ২৩ কোটি মানুষের ভাষা হওয়া সত্ত্বেও বাংলা এখনও UKC ধারণা জগতের সামান্য অংশই শব্দভুক্ত করেছে। এই প্ল্যাটফর্ম সেই ফাঁক পূরণ করতেই তৈরি।",
  },
  currentSnapshot: {
    en: "The current lexicon snapshot",
    bn: "বর্তমান অভিধানের চিত্র",
  },
  rolesTitle: { en: "Seven roles", bn: "সাতটি ভূমিকা" },

  /* Login */
  signInTitle: {
    en: "Sign in with your credentials",
    bn: "আপনার শংসাপত্র দিয়ে সাইন ইন করুন",
  },
  sessionNote: {
    en: "Your secure session lasts 1 hour. Access and refresh tokens are rotated automatically. Credential issuance, password resets and first-login password changes are recorded in the tamper-evident audit trail.",
    bn: "আপনার সুরক্ষিত সেশন ১ ঘণ্টা স্থায়ী। অ্যাক্সেস ও রিফ্রেশ টোকেন স্বয়ংক্রিয়ভাবে রোটেট হয়। শংসাপত্র ইস্যু, পাসওয়ার্ড রিসেট ও প্রথম-লগইন পাসওয়ার্ড পরিবর্তন অডিট ট্রেইলে নথিভুক্ত হয়।",
  },
  signInIntro: {
    en: "Access to the Bengali LKC platform is credential-based. Sign in with your username or registered email, plus the password issued by the Platform Architect. One-time passwords must be changed at first login.",
    bn: "বাংলা এলকেসি প্ল্যাটফর্মে প্রবেশ শংসাপত্রভিত্তিক। আপনার ব্যবহারকারী নাম অথবা নিবন্ধিত ইমেইল এবং Platform Architect ইস্যু করা পাসওয়ার্ড দিয়ে সাইন ইন করুন। একবার ব্যবহারযোগ্য পাসওয়ার্ড প্রথম লগইনে পরিবর্তন করতে হয়।",
  },
  username: { en: "Username", bn: "ব্যবহারকারী নাম" },
  password: { en: "Password", bn: "পাসওয়ার্ড" },
  signIn: { en: "Sign in", bn: "সাইন ইন" },
  signingIn: { en: "Signing in…", bn: "সাইন ইন হচ্ছে…" },
  forgotYourPassword: {
    en: "Forgot your password?",
    bn: "পাসওয়ার্ড ভুলে গেছেন?",
  },
  demoCredentials: {
    en: "Demonstration credentials",
    bn: "ডেমো শংসাপত্র",
  },
  demoCredentialsHint: {
    en: "This is a demo deployment — click any credential to explore that role's dashboard.",
    bn: "এটি একটি ডেমো — যেকোনো শংসাপত্রে ক্লিক করে সেই ভূমিকার ড্যাশবোর্ড দেখুন।",
  },

  /* Dashboard nav */
  navDashboard: { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  navLeaderboard: { en: "Leader Board", bn: "লিডারবোর্ড" },
  navCommunity: { en: "Community", bn: "কমিউনিটি" },
  navDictionary: { en: "Dictionary Browse", bn: "অভিধান ব্রাউজ" },
  navSearch: { en: "Search", bn: "অনুসন্ধান" },
  navIliFinder: { en: "ILI Finder", bn: "ILI Finder" },
  navStatistics: { en: "Data Statistics", bn: "তথ্য পরিসংখ্যান" },
  navUsers: { en: "User Management", bn: "ব্যবহারকারী ব্যবস্থাপনা" },
  navCredentials: { en: "Credential Management", bn: "শংসাপত্র ব্যবস্থাপনা" },
  navQueue: { en: "Queue Management", bn: "সারি ব্যবস্থাপনা" },
  navQuickInput: { en: "Data Entry (Quick Input)", bn: "তথ্য এন্ট্রি (Quick Input)" },
  navQuickInputMod: {
    en: "Quick Input / Direct Approval",
    bn: "Quick Input / সরাসরি অনুমোদন",
  },
  navQuickInputContrib: {
    en: "New Entry (Quick Input)",
    bn: "নতুন এন্ট্রি (Quick Input)",
  },
  navExport: { en: "XML Export", bn: "XML রপ্তানি" },
  navAudit: { en: "Audit Log", bn: "অডিট লগ" },
  navConfig: { en: "System Configuration", bn: "সিস্টেম কনফিগারেশন" },
  navArbitration: { en: "Arbitration", bn: "সালিশ" },
  navArbitrationTie: {
    en: "Arbitration Oversight",
    bn: "সালিশ তত্ত্বাবধান",
  },
  navCorrections: { en: "Pending Corrections", bn: "মুলতুবি সংশোধন" },
  navSubmissions: { en: "My Submissions", bn: "আমার জমা" },
  navDisputes: { en: "My Disputes", bn: "আমার বিরোধ" },
  navReviewQueue: { en: "Review Queue", bn: "পর্যালোচনা সারি" },
  navLingQueue: {
    en: "Linguistic Review Queue",
    bn: "ভাষাতাত্ত্বিক পর্যালোচনা সারি",
  },
  navHistory: { en: "My Review History", bn: "আমার পর্যালোচনা ইতিহাস" },
  navValHistory: {
    en: "My Validation History",
    bn: "আমার যাচাই ইতিহাস",
  },
  navEscalations: {
    en: "My Escalations & Disputes",
    bn: "আমার এস্কেলেশন ও বিরোধ",
  },
  navArbCases: { en: "Arbitration Cases", bn: "সালিশ মামলা" },
  viewProfile: { en: "View profile →", bn: "প্রোফাইল দেখুন →" },
  toggleNav: { en: "Toggle navigation", bn: "নেভিগেশন টগল" },

  /* Roles (keep English titles; Bengali explanation short) */
  role_PLATFORM_ARCHITECT: {
    en: "Platform Architect",
    bn: "Platform Architect",
  },
  role_SYSTEM_MODERATOR: {
    en: "System Moderator",
    bn: "System Moderator",
  },
  role_CONTRIBUTOR: {
    en: "Lexical Contributor",
    bn: "Lexical Contributor",
  },
  role_LEXICAL_EDITOR: {
    en: "Lexical Editor",
    bn: "Lexical Editor",
  },
  role_CHIEF_LEXICAL_EDITOR: {
    en: "Chief Lexical Editor",
    bn: "Chief Lexical Editor",
  },
  role_ARBITRATION_CURATOR: {
    en: "Arbitration Curator",
    bn: "Arbitration Curator",
  },
  roleVisitor: {
    en: "Visitor (unauthenticated)",
    bn: "দর্শক (লগইন ছাড়া)",
  },
  roleDesc_PLATFORM_ARCHITECT: {
    en: "Full system governance: users, login credentials, configuration, anti-bot limits, export control and audit logs.",
    bn: "পূর্ণ সিস্টেম পরিচালনা: ব্যবহারকারী, লগইন শংসাপত্র, কনফিগারেশন, অ্যান্টি-বট সীমা, রপ্তানি নিয়ন্ত্রণ ও অডিট লগ।",
  },
  roleDesc_SYSTEM_MODERATOR: {
    en: "Operational queue governance: clears anti-bot holds, breaks arbitration ties, applies panel corrections, direct approval.",
    bn: "অপারেশনাল সারি পরিচালনা: অ্যান্টি-বট হোল্ড খোলা, সালিশের টাই ভাঙা, প্যানেল সংশোধন প্রয়োগ, সরাসরি অনুমোদন।",
  },
  roleDesc_CONTRIBUTOR: {
    en: "Enters new lexical entries via Quick Input, manages drafts, and holds formal dispute rights to the arbitration panel.",
    bn: "Quick Input দিয়ে নতুন শব্দভুক্তি জমা, খসড়া পরিচালনা, এবং সালিশ প্যানেলে আনুষ্ঠানিক বিরোধের অধিকার।",
  },
  roleDesc_LEXICAL_EDITOR: {
    en: "Primary validation: approves, flags for correction, or rejects contributor submissions with mandatory reasoning.",
    bn: "প্রাথমিক যাচাই: অনুমোদন, সংশোধনের জন্য চিহ্নিতকরণ, অথবা বাধ্যতামূলক কারণসহ প্রত্যাখ্যান।",
  },
  roleDesc_CHIEF_LEXICAL_EDITOR: {
    en: "Final linguistic validation. Only this role (or a binding panel verdict) promotes an entry to VALIDATED.",
    bn: "চূড়ান্ত ভাষাতাত্ত্বিক যাচাই। শুধু এই ভূমিকা (বা বাধ্যতামূলক প্যানেল রায়) এন্ট্রিকে VALIDATED করে।",
  },
  roleDesc_ARBITRATION_CURATOR: {
    en: "Votes on escalated disputes. Verdicts require a 2/3 quorum and a majority; ties go to the System Moderator.",
    bn: "এস্কেলেটেড বিরোধে ভোট। রায়ের জন্য ২/৩ কোরাম ও সংখ্যাগরিষ্ঠতা প্রয়োজন; টাই হলে System Moderator সিদ্ধান্ত নেন।",
  },
  roleDescVisitor: {
    en: "Word search, gloss search and dictionary browse over validated entries — with no internal identifiers exposed.",
    bn: "যাচাইকৃত এন্ট্রিতে শব্দ ও সংজ্ঞা অনুসন্ধান এবং অভিধান ব্রাউজ — অভ্যন্তরীণ ID দেখানো হয় না।",
  },
  aboutRolesTitle: {
    en: "Seven roles, one pipeline",
    bn: "সাতটি ভূমিকা, একটি প্রক্রিয়া",
  },
  aboutConceptTitle: {
    en: "Concept-anchored by design",
    bn: "ধারণাভিত্তিক নকশা",
  },
  aboutConceptBody: {
    en: "Every synset carries an Inter-Lingual Index (ILI) code that anchors it to the UKC's language-independent Concept Core. The platform never modifies or creates ILI codes — it only references existing ones, so every validated Bengali word becomes instantly interoperable with the vocabularies of hundreds of other languages when merged back into the UKC.",
    bn: "প্রতিটি synset-এ একটি ILI কোড থাকে যা তাকে UKC-এর ভাষা-নিরপেক্ষ Concept Core-এ বাঁধে। প্ল্যাটফর্ম কখনো ILI কোড তৈরি বা পরিবর্তন করে না — শুধু বিদ্যমান কোড উল্লেখ করে, ফলে যাচাইকৃত প্রতিটি বাংলা শব্দ UKC-তে মিলিত হলে শত শত ভাষার সাথে সাথেই আন্তঃকার্যকর হয়।",
  },
  wantToContribute: {
    en: "Want to contribute?",
    bn: "অবদান রাখতে চান?",
  },
  wantToContributeBody: {
    en: "Login credentials are issued by the Platform Architect and emailed to you — or try the demo credentials on the login page.",
    bn: "লগইন শংসাপত্র Platform Architect ইস্যু করে ইমেইল করেন — অথবা লগইন পৃষ্ঠার ডেমো শংসাপত্র ব্যবহার করুন।",
  },
  goToLogin: { en: "Go to Login", bn: "লগইনে যান" },
  polysemousWords: { en: "Polysemous words", bn: "বহুঅর্থক শব্দ" },
  validatedEntries: { en: "Validated entries", bn: "যাচাইকৃত এন্ট্রি" },
  interestNotSure: { en: "Not sure yet", bn: "এখনো নিশ্চিত নই" },
  interestContributor: {
    en: "Lexical Contributor — enter Bengali words",
    bn: "Lexical Contributor — বাংলা শব্দ যোগ",
  },
  interestEditor: {
    en: "Lexical Editor — primary validation",
    bn: "Lexical Editor — প্রাথমিক যাচাই",
  },
  interestChief: {
    en: "Chief Lexical Editor — final linguistic review",
    bn: "Chief Lexical Editor — চূড়ান্ত ভাষাতাত্ত্বিক পর্যালোচনা",
  },
  interestCurator: {
    en: "Arbitration Curator — dispute panel voting",
    bn: "Arbitration Curator — বিরোধ প্যানেলে ভোট",
  },
  interestOther: {
    en: "Other / research collaboration",
    bn: "অন্যান্য / গবেষণা সহযোগিতা",
  },
  whyJoinPlaceholder: {
    en: "Tell us about your background with Bengali linguistics, lexicography, or related research, and how you would like to contribute…",
    bn: "বাংলা ভাষাবিজ্ঞান, অভিধানবিদ্যা বা সংশ্লিষ্ট গবেষণায় আপনার অভিজ্ঞতা এবং কীভাবে অবদান রাখতে চান লিখুন…",
  },
  hfSpacesNote: {
    en: "On Hugging Face Spaces, use the Open in full tab link at the top of the page before signing in — embedded previews block session cookies in most browsers.",
    bn: "Hugging Face Spaces-এ সাইন ইনের আগে পৃষ্ঠার উপরের «Open in full tab» লিঙ্ক ব্যবহার করুন — এমবেডেড প্রিভিউতে অধিকাংশ ব্রাউজারে সেশন কুকি ব্লক হয়।",
  },
  howPipelineWorks: {
    en: "How the validation pipeline works",
    bn: "যাচাই প্রক্রিয়া যেভাবে কাজ করে",
  },
  ukcLicense: {
    en: "CC BY-NC-SA 4.0 License",
    bn: "CC BY-NC-SA 4.0 লাইসেন্স",
  },
  sensesPolysemous: {
    en: "senses (polysemous)",
    bn: "অর্থ (বহুঅর্থক)",
  },
  pos_n: { en: "Noun", bn: "বিশেষ্য" },
  pos_v: { en: "Verb", bn: "ক্রিয়া" },
  pos_a: { en: "Adjective", bn: "বিশেষণ" },
  pos_r: { en: "Adverb", bn: "ক্রিয়া বিশেষণ" },
  posLegend: { en: "POS legend", bn: "পদের সূচি" },
  entriesPageOf: {
    en: "entries · page",
    bn: "এন্ট্রি · পৃষ্ঠা",
  },
  of: { en: "of", bn: "এর" },
  filterByPos: { en: "Filter by POS", bn: "পদ অনুযায়ী বাছাই" },
  searchHint: {
    en: "Type a Bengali word above — exact matches are listed first, then prefix matches.",
    bn: "উপরে একটি বাংলা শব্দ লিখুন — সম্পূর্ণ মিল আগে, তারপর আংশিক মিল।",
  },
  noResultsFor: { en: "No results for", bn: "কোনো ফলাফল নেই" },
  noResultsHint: {
    en: "Try a shorter prefix, or search by definition in the Gloss tab.",
    bn: "ছোট উপসর্গ চেষ্টা করুন, অথবা Gloss ট্যাবে সংজ্ঞা দিয়ে খুঁজুন।",
  },
  results: { en: "results", bn: "ফলাফল" },
  result: { en: "result", bn: "ফলাফল" },
  exact: { en: "exact", bn: "সম্পূর্ণ" },
  prefix: { en: "prefix", bn: "আংশিক" },
  forgotTitle: { en: "Forgot your password?", bn: "পাসওয়ার্ড ভুলে গেছেন?" },
  forgotIntro: {
    en: "Enter your username or registered email. We will send a one-time verification code (OTP) to your registered email. Enter that code with a new password to reset access. You can then sign in with username or email.",
    bn: "আপনার ব্যবহারকারী নাম বা নিবন্ধিত ইমেইল লিখুন। নিবন্ধিত ইমেইলে একবার ব্যবহারযোগ্য যাচাই কোড (OTP) পাঠানো হবে। সেই কোড ও নতুন পাসওয়ার্ড দিয়ে অ্যাক্সেস রিসেট করুন। এরপর ব্যবহারকারী নাম বা ইমেইল দিয়ে সাইন ইন করতে পারবেন।",
  },
  usernameOrEmail: { en: "Username or email", bn: "ব্যবহারকারী নাম বা ইমেইল" },
  sendReset: { en: "Send Reset Email", bn: "রিসেট ইমেইল পাঠান" },
  sendResetOtp: {
    en: "Send OTP to Email",
    bn: "ইমেইলে OTP পাঠান",
  },
  forgotStepRequestOtp: {
    en: "Request OTP",
    bn: "OTP অনুরোধ",
  },
  forgotStepSetPassword: {
    en: "OTP + new password",
    bn: "OTP + নতুন পাসওয়ার্ড",
  },
  forgotChangeIdentifier: {
    en: "Use a different username or email",
    bn: "অন্য ব্যবহারকারী নাম বা ইমেইল ব্যবহার করুন",
  },
  backToLogin: { en: "← Back to login", bn: "← লগইনে ফিরুন" },
  demoOtpNote: {
    en: "Demo deployment only — in production this one-time password is delivered exclusively by email.",
    bn: "শুধু ডেমো — প্রোডাকশনে এই একবার ব্যবহারযোগ্য পাসওয়ার্ড শুধু ইমেইলে পাঠানো হয়।",
  },
  senseN: { en: "Sense", bn: "অর্থ" },
  senseRelations: { en: "Sense relations", bn: "অর্থ সম্পর্ক" },
  synsetRelations: { en: "Synset relations", bn: "Synset সম্পর্ক" },
  synonyms: { en: "Synonyms", bn: "সমার্থক" },
  noDefinitionYet: {
    en: "No definition recorded for this concept yet.",
    bn: "এই ধারণার জন্য এখনো কোনো সংজ্ঞা নেই।",
  },
  more: { en: "more", bn: "আরও" },
  externalSense: { en: "external sense", bn: "বহিঃস্থ sense" },

  /* Change password */
  setNewPassword: { en: "Set a new password", bn: "নতুন পাসওয়ার্ড সেট করুন" },
  changeYourPassword: {
    en: "Change your password",
    bn: "পাসওয়ার্ড পরিবর্তন করুন",
  },
  firstLoginBanner: {
    en: "You signed in with a system-generated one-time password. You must set a new password before you can access any other part of the platform. The one-time password is invalidated the instant your new password is confirmed.",
    bn: "আপনি সিস্টেম-উৎপাদিত একবার ব্যবহারযোগ্য পাসওয়ার্ড দিয়ে সাইন ইন করেছেন। প্ল্যাটফর্মের অন্য অংশে যাওয়ার আগে নতুন পাসওয়ার্ড সেট করতে হবে। নতুন পাসওয়ার্ড নিশ্চিত হলেই পুরনোটি বাতিল হয়।",
  },
  changePasswordIntro: {
    en: "Choose a new password for your account. The change is recorded in the tamper-evident audit trail.",
    bn: "আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড বেছে নিন। পরিবর্তন অডিট ট্রেইলে নথিভুক্ত হয়।",
  },
  stepVerifyIdentity: { en: "Verify identity", bn: "পরিচয় যাচাই" },
  stepOtpNewPassword: {
    en: "OTP + new password",
    bn: "OTP + নতুন পাসওয়ার্ড",
  },
  oneTimePassword: {
    en: "One-time password",
    bn: "একবার ব্যবহারযোগ্য পাসওয়ার্ড",
  },
  currentPassword: { en: "Current password", bn: "বর্তমান পাসওয়ার্ড" },
  otpAfterVerify: {
    en: "After verification, a one-time OTP code is sent to your registered email address (2-step validation).",
    bn: "যাচাইয়ের পর নিবন্ধিত ইমেইলে একবার ব্যবহারযোগ্য OTP পাঠানো হয় (২-ধাপ যাচাই)।",
  },
  sendingOtp: { en: "Sending OTP…", bn: "OTP পাঠানো হচ্ছে…" },
  verifySendOtp: {
    en: "Verify & Send OTP to Email",
    bn: "যাচাই করে ইমেইলে OTP পাঠান",
  },
  otpSentTo: { en: "An OTP has been sent to", bn: "OTP পাঠানো হয়েছে" },
  validFor: { en: "valid for", bn: "মেয়াদ" },
  minutes: { en: "minutes", bn: "মিনিট" },
  demoOtpShows: {
    en: "Demo deployment shows the code here — in production it is delivered exclusively by email:",
    bn: "ডেমোতে কোড এখানে দেখায় — প্রোডাকশনে শুধু ইমেইলে পাঠানো হয়:",
  },
  otpFromEmail: {
    en: "OTP from your registered email",
    bn: "নিবন্ধিত ইমেইলের OTP",
  },
  newPassword: { en: "New password", bn: "নতুন পাসওয়ার্ড" },
  confirmNewPassword: {
    en: "Confirm new password",
    bn: "নতুন পাসওয়ার্ড নিশ্চিত করুন",
  },
  minChars: {
    en: "Minimum {n} characters (configurable password policy).",
    bn: "কমপক্ষে {n} অক্ষর (কনফিগারযোগ্য পাসওয়ার্ড নীতি)।",
  },
  saving: { en: "Saving…", bn: "সংরক্ষণ হচ্ছে…" },
  setNewPasswordBtn: {
    en: "Set New Password",
    bn: "নতুন পাসওয়ার্ড সেট করুন",
  },
  resendOtp: {
    en: "Didn't receive the code? Resend OTP",
    bn: "কোড পাননি? OTP আবার পাঠান",
  },
  passwordsMismatch: {
    en: "New password and confirmation do not match.",
    bn: "নতুন পাসওয়ার্ড ও নিশ্চিতকরণ মিলছে না।",
  },
  passwordTooShort: {
    en: "New password must be at least {n} characters.",
    bn: "নতুন পাসওয়ার্ড কমপক্ষে {n} অক্ষরের হতে হবে।",
  },

  /* Extra search chrome */
  glossHint: {
    en: "Searches definition texts in Bengali and English (exact substring match). Example: পাখি or bird.",
    bn: "বাংলা ও ইংরেজি সংজ্ঞা টেক্সটে অনুসন্ধান (সম্পূর্ণ সাবস্ট্রিং মিল)। উদাহরণ: পাখি বা bird।",
  },
  noDefsContain: {
    en: "No definitions contain",
    bn: "কোনো সংজ্ঞায় নেই",
  },
  glossEmptyHint: {
    en: "Gloss search currently uses exact matching; LLM-assisted semantic matching is a planned enhancement.",
    bn: "Gloss অনুসন্ধান এখন exact matching ব্যবহার করে; LLM-সহায়ক semantic matching পরিকল্পিত উন্নতি।",
  },
  wordsLabel: { en: "Words", bn: "শব্দ" },
  lexicalGap: {
    en: "lexical gap — no Bengali word yet",
    bn: "lexical gap — এখনো বাংলা শব্দ নেই",
  },
  synsetHint: {
    en: "Accepts a Synset ID (ben-syn442834), an ILI code (01605630-n), or a natural-language concept description (full-text over definitions).",
    bn: "Synset ID (ben-syn442834), ILI কোড (01605630-n), অথবা ধারণার প্রাকৃতিক ভাষার বর্ণনা গ্রহণ করে (সংজ্ঞায় full-text)।",
  },
  noSynsetsMatch: { en: "No synsets match", bn: "কোনো synset মিলেনি" },
  synsetEmptyHint: {
    en: "Check the ID/ILI format, or describe the concept in plain Bengali or English.",
    bn: "ID/ILI ফরম্যাট যাচাই করুন, অথবা বাংলা বা ইংরেজিতে ধারণা বর্ণনা করুন।",
  },
  openSynset: { en: "Open synset →", bn: "Synset খুলুন →" },
  bengaliWords: { en: "Bengali words", bn: "বাংলা শব্দ" },
  relationsLabel: { en: "Relations", bn: "সম্পর্ক" },
  senseHint: {
    en: "Accepts a Sense ID, e.g. ben-sen691008.",
    bn: "Sense ID গ্রহণ করে, যেমন: ben-sen691008।",
  },
  noSenseFound: { en: "No sense found for", bn: "কোনো sense পাওয়া যায়নি" },
  senseEmptyHint: {
    en: "Sense IDs follow the pattern ben-sen{integer}.",
    bn: "Sense ID-এর ধরন: ben-sen{integer}।",
  },
  belongsTo: { en: "belongs to", bn: "অন্তর্গত" },
  parentSynset: { en: "Parent synset", bn: "মূল synset" },
  noSenseRelations: {
    en: "This sense has no recorded sense-level relations.",
    bn: "এই sense-এর কোনো sense-স্তরের সম্পর্ক নেই।",
  },
} as const;

export type StringKey = keyof typeof STRINGS;

interface I18nContextShape {
  lang: UiLanguage;
  setLang: (l: UiLanguage) => void;
  t: (key: StringKey | string) => string;
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

function applyDocumentLang(lang: UiLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang === "bn" ? "bn" : "en";
  document.body.classList.toggle("lang-bn", lang === "bn");
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLanguage>("en");

  useEffect(() => {
    const saved = readSavedLang();
    setLangState(saved);
    applyDocumentLang(saved);
  }, []);

  const setLang = useCallback((l: UiLanguage) => {
    setLangState(l);
    window.localStorage.setItem("lkc-lang", l);
    applyDocumentLang(l);
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = STRINGS[key as StringKey];
      return entry ? entry[lang] : key;
    },
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
