import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { UsersManager } from "@/components/dashboard/UserAdmin";

export const metadata: Metadata = { title: "User Management" };

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "manage_users")) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="User Management"
        subtitle="All role assignments are exclusively controlled by the Platform Architect. Suspended accounts are immediately locked and their login credentials frozen pending review."
      />
      <UsersManager />
      <p className="mt-3 text-xs text-slate-400">
        Suspension and reinstatement events are recorded in the tamper-evident
        audit trail. Entries submitted during a flagged burst remain UNDER_REVIEW
        until cleared by a System Moderator.
      </p>
    </div>
  );
}
