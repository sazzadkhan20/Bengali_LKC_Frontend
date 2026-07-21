import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { PublicHeader } from "@/components/public/Header";
import { PublicFooter } from "@/components/public/Footer";
import { IframeNotice } from "@/components/public/IframeNotice";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <IframeNotice spaceHost={process.env.SPACE_HOST} />
      <PublicHeader session={session} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
