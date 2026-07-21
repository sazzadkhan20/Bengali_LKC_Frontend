import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store, userById } from "@/lib/store";
import { formatDate, ROLE_LABEL } from "@/lib/format";
import { Card, CardHeader, PageTitle } from "@/components/ui";
import {
  CreateUserForm,
  CredentialToggle,
  ForceResetButton,
} from "@/components/dashboard/CredentialAdmin";

export const metadata: Metadata = { title: "Credential Management" };

export default async function CredentialsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "manage_credentials")) redirect("/dashboard");

  const credentials = [...store.credentials].sort((a, b) =>
    b.issuedAt.localeCompare(a.issuedAt)
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Credential Management"
        subtitle="No user may self-register: every account and its initial one-time password is created by the Platform Architect and emailed to the user. The password must be changed at first login. All credential events are logged in the tamper-evident audit trail (SRS §3.2)."
      />

      <Card className="mb-6">
        <CardHeader
          title="Create a user & issue login credential"
          subtitle="The system generates a one-time password and delivers it to the registered email address."
        />
        <div className="p-5">
          <CreateUserForm />
        </div>
      </Card>

      <Card>
        <CardHeader title={`All credentials (${credentials.length})`} />
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-semibold">Username</th>
                <th className="px-3 py-3 font-semibold">Holder</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Issued</th>
                <th className="px-3 py-3 font-semibold">Password changed</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {credentials.map((c) => {
                const holder = userById(c.userId);
                return (
                  <tr key={c.id} className={c.deactivated ? "opacity-50" : ""}>
                    <td className="px-5 py-3 font-mono text-xs font-bold text-slate-700">
                      {c.username}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {holder?.name}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {holder ? ROLE_LABEL[holder.role] : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {formatDate(c.issuedAt)}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {c.lastChangedAt ? formatDate(c.lastChangedAt) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {c.deactivated ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                          Deactivated
                        </span>
                      ) : c.oneTime ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                          One-time pending
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {!c.deactivated ? (
                          <ForceResetButton userId={c.userId} />
                        ) : null}
                        <CredentialToggle
                          credentialId={c.id}
                          deactivated={c.deactivated}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        Deactivating or force-resetting a credential immediately invalidates
        all active sessions for that account. Accounts with a first-login
        password change still pending after 7 days are highlighted on the
        Admin Dashboard (SRS §7.1.1).
      </p>
    </div>
  );
}
