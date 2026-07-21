import Link from "next/link";
import { HomeHero } from "@/components/public/HomeHero";
import { lexiconStats } from "@/lib/lexicon";
import { formatNumber } from "@/lib/format";

const PIPELINE = [
  {
    step: "১",
    title: "Submit",
    role: "Lexical Contributor",
    text: "A contributor enters a Bengali word with its part of speech, concept (synset) linkage and definition through the Quick Input form.",
  },
  {
    step: "২",
    title: "Primary Validation",
    role: "Lexical Editor",
    text: "An editor checks structure and references — approving, flagging for correction, or rejecting with a mandatory reason.",
  },
  {
    step: "৩",
    title: "Linguistic Validation",
    role: "Chief Lexical Editor",
    text: "The Chief Lexical Editor performs the definitive linguistic review. Only this approval promotes an entry to VALIDATED.",
  },
  {
    step: "৪",
    title: "Arbitration",
    role: "Arbitration Curators",
    text: "Disputes are resolved by a curator panel vote with a 2/3 quorum rule — binding, auditable and fair.",
  },
  {
    step: "৫",
    title: "Export to UKC",
    role: "Architect / Moderator",
    text: "Validated entries are exported as UKC-compatible LMF XML and merged into the Universal Knowledge Core.",
  },
];

export default function HomePage() {
  const stats = lexiconStats();
  const counters = [
    { label: "Lexical Entries", labelBn: "শব্দভুক্তি", value: stats.totalEntries },
    { label: "Word Senses", labelBn: "শব্দার্থ", value: stats.totalSenses },
    { label: "Synsets (Concepts)", labelBn: "ধারণা", value: stats.totalSynsets },
    {
      label: "Semantic Relations",
      labelBn: "সম্পর্ক",
      value:
        Object.values(stats.synsetRelationCounts).reduce((a, b) => a + b, 0) +
        Object.values(stats.senseRelationCounts).reduce((a, b) => a + b, 0),
    },
  ];

  return (
    <>
      <HomeHero />

      {/* Live lexicon counters */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden sm:grid-cols-4">
          {counters.map((c) => (
            <div key={c.label} className="px-3 py-6 text-center sm:px-6 sm:py-8">
              <p className="text-[clamp(1.35rem,4.5vw,2.25rem)] font-extrabold tabular-nums text-emerald-800">
                {formatNumber(c.value)}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
                {c.label}
              </p>
              <p className="font-bengali text-[11px] text-slate-400 sm:text-xs">{c.labelBn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
          <div>
            <h2 className="text-[clamp(1.35rem,3.5vw,1.875rem)] font-bold tracking-tight text-slate-900">
              From local words to universal concepts
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              The Universal Knowledge Core (UKC) maps the vocabularies of{" "}
              <strong>335 languages</strong> onto a single language-independent
              concept space. Bengali — spoken by over 230 million people —
              currently lexicalises only a fraction of those concepts.
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              The Bengali LKC closes that gap through structured crowdsourcing:
              every submitted word is linked to a concept via its{" "}
              <em>Inter-Lingual Index (ILI)</em> code, validated by a
              three-tier editorial pipeline, and exported back to the UKC as
              standards-compliant LMF XML.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/about"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                Learn more
              </Link>
              <Link
                href="/dictionary"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Explore the lexicon
              </Link>
            </div>
          </div>

          {/* word-synset-concept illustration */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="font-bengali rounded-2xl bg-emerald-50 px-4 py-3 text-xl font-bold text-emerald-900 ring-1 ring-emerald-200 sm:px-5 sm:text-2xl">
                  গাংচিল
                </div>
                <div className="text-sm text-slate-400">word · বিশেষ্য</div>
              </div>
              <div className="ml-4 h-6 w-px bg-slate-300 sm:ml-6" />
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 ring-1 ring-sky-200 sm:px-5">
                  Synset <span className="font-mono text-xs">ben-syn442834</span>
                </div>
                <div className="text-sm text-slate-400">
                  shared meaning in Bengali
                </div>
              </div>
              <div className="ml-4 h-6 w-px bg-slate-300 sm:ml-6" />
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 ring-1 ring-violet-200 sm:px-5">
                  ILI <span className="font-mono text-xs">01605630-n</span>
                </div>
                <div className="text-sm text-slate-400">
                  universal concept — “seagull”
                </div>
              </div>
              <p className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                Words are language-specific; concepts are universal. The ILI
                code anchors every Bengali synset to the UKC Concept Core,
                making the lexicon interoperable with hundreds of other
                languages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="border-t border-slate-200 bg-white py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-[clamp(1.35rem,3.5vw,1.875rem)] font-bold tracking-tight text-slate-900">
            How the validation pipeline works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-500">
            Seven roles, nine lifecycle states, one auditable path from a
            contributor&apos;s draft to the Universal Knowledge Core.
          </p>
          <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5">
            {PIPELINE.map((p, i) => (
              <div key={p.title} className="relative">
                {i < PIPELINE.length - 1 ? (
                  <div className="absolute top-7 left-[60%] hidden h-px w-[80%] bg-gradient-to-r from-emerald-300 to-transparent lg:block" />
                ) : null}
                <div className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition hover:border-emerald-300 hover:bg-white hover:shadow-md">
                  <span className="font-bengali flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-bold text-white shadow-sm">
                    {p.step}
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    {p.title}
                  </h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    {p.role}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {p.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-4 py-12 text-center text-white sm:py-14">
        <h2 className="font-bengali text-[clamp(1.5rem,5vw,1.875rem)] font-bold">
          আপনার ভাষা, আপনার অবদান
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-emerald-100">
          Your language, your contribution. Join the crowdsourcing effort and
          help Bengali take its full place in the Universal Knowledge Core.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-7 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-emerald-50"
        >
          Login as a Contributor
        </Link>
      </section>
    </>
  );
}
