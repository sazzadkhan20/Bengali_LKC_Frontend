import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { PageTitle } from "@/components/ui";
import { CredentialsManager, type ApplicationPrefill } from "@/components/dashboard/CredentialAdmin";

export const metadata: Metadata = { title: "Credential Management" };
export const dynamic = "force-dynamic";

type ApplicationRow = ApplicationPrefill & {
  status: "NEW" | "APPROVED" | "REJECTED";
  issuedUsername: string | null;
  existingAccount: { id: string; username: string } | null;
  error?: string;
};

async function loadApplication(id: string): Promise<{ app: ApplicationPrefill | null; notice: string | null }> {
  try {
    const res = await backendAuthedFetch<ApplicationRow>(`/api/applications/${encodeURIComponent(id)}`);
    if (res.status === 404) return { app: null, notice: `Application ${id} was not found.` };
    if (!res.ok) return { app: null, notice: res.data.error ?? "The application could not be loaded." };
    const a = res.data;
    if (a.status !== "NEW") {
      return {
        app: null,
        notice:
          a.status === "APPROVED"
            ? `Application ${a.id} was already approved${a.issuedUsername ? ` (account ${a.issuedUsername})` : ""}.`
            : `Application ${a.id} was rejected, so no account can be issued for it.`,
      };
    }
    if (a.existingAccount) {
      return {
        app: null,
        notice: `${a.email} already belongs to the account ${a.existingAccount.username}, so no new account can be issued for application ${a.id}. Reject it from the applications page instead.`,
      };
    }
    return {
      app: {
        id: a.id,
        name: a.name,
        email: a.email,
        dob: a.dob,
        institution: a.institution,
        occupation: a.occupation,
        interestRole: a.interestRole,
      },
      notice: null,
    };
  } catch {
    return { app: null, notice: "The application service is unavailable. Try again shortly." };
  }
}

export default async function CredentialsPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "manage_credentials")) redirect("/dashboard");

  const { application } = await searchParams;
  const applicationId = typeof application === "string" ? application.trim().slice(0, 60) : "";
  const { app, notice } = applicationId ? await loadApplication(applicationId) : { app: null, notice: null };

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Credential Management"
        subtitle="Accounts are invitation-only. Each login is created here and sent to the user’s registered email. New users must change their temporary password after the first sign-in."
      />
      {notice ? (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{notice}</span>
          <Link href="/dashboard/applications" className="font-semibold underline hover:text-red-800">
            Back to applications
          </Link>
        </div>
      ) : null}
      <CredentialsManager key={app?.id ?? "none"} application={app} />
    </div>
  );
}
