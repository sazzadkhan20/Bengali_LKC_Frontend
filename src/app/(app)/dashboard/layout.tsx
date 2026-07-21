import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // The one-time password must be replaced before any other part of the
  // platform can be accessed (SRS §3.2).
  if (session.mustChangePassword) redirect("/change-password");

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 lg:flex-row">
      <DashboardSidebar session={session} />
      <main className="min-w-0 flex-1 px-4 py-6 pb-[max(1.5rem,var(--safe-bottom))] sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
