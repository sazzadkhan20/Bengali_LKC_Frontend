import type { Metadata } from "next";
import Link from "next/link";
import { lexiconMeta, lexiconStats } from "@/lib/lexicon";
import { formatNumber, ROLE_LABEL } from "@/lib/format";
import type { Role } from "@/lib/types";

export const metadata: Metadata = { title: "About" };

const ROLES: { role: Role; desc: string }[] = [
  { role: "PLATFORM_ARCHITECT", desc: "Full system governance: users, login credentials, configuration, anti-bot limits, export control and audit logs." },
  { role: "SYSTEM_MODERATOR", desc: "Operational queue governance: clears anti-bot holds, breaks arbitration ties, applies panel corrections, direct approval." },
  { role: "CONTRIBUTOR", desc: "Enters new lexical entries via Quick Input, manages drafts, and holds formal dispute rights to the arbitration panel." },
  { role: "LEXICAL_EDITOR", desc: "Primary validation: approves, flags for correction, or rejects contributor submissions with mandatory reasoning." },
  { role: "CHIEF_LEXICAL_EDITOR", desc: "Final linguistic validation. Only this role (or a binding panel verdict) promotes an entry to VALIDATED." },
  { role: "ARBITRATION_CURATOR", desc: "Votes on escalated disputes. Verdicts require a 2/3 quorum and a majority; ties go to the System Moderator." },
];

export default function AboutPage() {
  const stats = lexiconStats();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        About the Bengali LKC
      </h1>
      <p className="mt-4 leading-relaxed text-slate-600">
        The <strong>Bengali Local Knowledge Core (Ben-LKC)</strong> is a
        role-based, web-accessible platform for crowdsourced lexical data
        entry, multi-tier validation, dispute resolution, and export of
        structured data fully compatible with the{" "}
        <strong>Universal Knowledge Core (UKC)</strong> Lexical Markup
        Framework (LMF) XML schema.
      </p>
      <p className="mt-3 leading-relaxed text-slate-600">
        The UKC, developed at the University of Trento, is a large-scale
        multilingual lexico-semantic knowledge base extending the Princeton
        WordNet model with language-independent concepts spanning 335
        languages. Bengali — despite its ~230 million native speakers —
        currently lexicalises only a small fraction of the UKC concept space.
        This platform exists to close that gap, one validated word at a time.
      </p>

      <h2 className="mt-10 text-xl font-bold text-slate-900">
        The current lexicon snapshot
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Lexical entries", value: stats.totalEntries },
          { label: "Word senses", value: stats.totalSenses },
          { label: "Synsets", value: stats.totalSynsets },
          { label: "Polysemous words", value: stats.polysemousEntries },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-emerald-800">
              {formatNumber(s.value)}
            </p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Seeded from <code className="font-mono">{lexiconMeta.id}</code> v
        {lexiconMeta.version}, published by {lexiconMeta.publisher}. Sources
        include IndoWordNet, Wiktionary, CogNet, MorphyNet and Princeton
        WordNet.
      </p>

      <h2 className="mt-10 text-xl font-bold text-slate-900">
        Seven roles, one pipeline
      </h2>
      <div className="mt-4 space-y-3">
        {ROLES.map((r) => (
          <div key={r.role} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-emerald-800">
              {ROLE_LABEL[r.role]}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{r.desc}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-emerald-800">
            Visitor (unauthenticated)
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Word search, gloss search and dictionary browse over validated
            entries — with no internal identifiers exposed.
          </p>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-bold text-slate-900">
        Concept-anchored by design
      </h2>
      <p className="mt-3 leading-relaxed text-slate-600">
        Every synset carries an <strong>Inter-Lingual Index (ILI)</strong>{" "}
        code that anchors it to the UKC&apos;s language-independent Concept
        Core. The platform never modifies or creates ILI codes — it only
        references existing ones, so every validated Bengali word becomes
        instantly interoperable with the vocabularies of hundreds of other
        languages when merged back into the UKC.
      </p>

      <div className="mt-10 rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
        <h3 className="font-bengali text-lg font-bold text-emerald-900">
          অবদান রাখতে চান?
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          Want to contribute? Login credentials are issued by the Platform
          Architect and emailed to you — or try the demo credentials on the
          login page.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
