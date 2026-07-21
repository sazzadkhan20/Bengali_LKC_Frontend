import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white pb-[var(--safe-bottom)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 font-bengali text-base font-bold text-white">
              অ
            </span>
            <span className="text-sm font-bold text-slate-900">
              Bengali LKC
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            A role-based crowdsourcing framework for Bengali lexical data
            entry, validation and UKC-compatible LMF XML export.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Explore
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link className="hover:text-emerald-700" href="/dictionary">Dictionary Browse</Link></li>
            <li><Link className="hover:text-emerald-700" href="/search">Word Search</Link></li>
            <li><Link className="hover:text-emerald-700" href="/search/gloss">Gloss Search</Link></li>
            <li><Link className="hover:text-emerald-700" href="/about">About the Project</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Contribute
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link className="hover:text-emerald-700" href="/login">Contributor Login</Link></li>
            <li><Link className="hover:text-emerald-700" href="/dashboard">Role Dashboards</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Universal Knowledge Core
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <a className="hover:text-emerald-700" href="http://ukc.datascientia.eu" target="_blank" rel="noreferrer">
                UKC LiveLanguage
              </a>
            </li>
            <li>
              <a className="hover:text-emerald-700" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
                CC BY-NC-SA 4.0 License
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4 text-center text-xs leading-relaxed text-slate-400">
        Bengali LKC Development Team · Based on the UKC lexicon{" "}
        <code className="font-mono">livelanguage-ben</code> (KnowDive,
        University of Trento)
      </div>
    </footer>
  );
}
