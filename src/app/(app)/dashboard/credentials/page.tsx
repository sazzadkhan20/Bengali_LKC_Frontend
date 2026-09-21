import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { CredentialsManager } from "@/components/dashboard/CredentialAdmin";

export const metadata: Metadata = { title: "Credential Management" };

export default async function CredentialsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "manage_credentials")) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Credential Management"
        subtitle="Accounts are invitation-only. Each login is created here and sent to the user’s registered email. New users must change their temporary password after the first sign-in."
      />
      <CredentialsManager />
    </div>
  );
}
