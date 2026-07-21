import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { SearchTabs } from "@/components/public/SearchTabs";

export default async function SearchLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-[clamp(1.35rem,3.5vw,1.75rem)] font-bold tracking-tight text-slate-900">
        Search the Bengali Lexicon
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {session
          ? "Word, gloss, synset / ILI and sense ID search with full internal ID visibility."
          : "Word and gloss search over all validated entries. Log in for synset, ILI and sense ID search."}
      </p>
      <SearchTabs authenticated={session !== null} />
      {children}
    </div>
  );
}
