import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { SearchPageHeader } from "@/components/public/SearchPageHeader";

export default async function SearchLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <SearchPageHeader authenticated={session !== null} />
      {children}
    </div>
  );
}
