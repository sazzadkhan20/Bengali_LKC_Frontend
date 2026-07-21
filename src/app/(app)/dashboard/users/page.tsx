import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store } from "@/lib/store";
import { formatDate, ROLE_LABEL } from "@/lib/format";
import { Card, PageTitle } from "@/components/ui";
import { UserToggle } from "@/components/dashboard/UserAdmin";

export const metadata: Metadata = { title: "User Management" };

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "manage_users")) redirect("/dashboard");

  const users = [...store.users].sort((a, b) =>
    a.role.localeCompare(b.role) || a.name.localeCompare(b.name)
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="User Management"
        subtitle="All role assignments are exclusively controlled by the Platform Architect (SRS §3.1). Suspended accounts are immediately locked and their login credentials frozen pending review."
      />
      <Card>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Joined</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className={u.suspended ? "bg-rose-50/40" : ""}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{u.name}</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      @{u.username}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-slate-600">
                    {ROLE_LABEL[u.role]}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400">{u.email}</td>
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {formatDate(u.joinedAt)}
                  </td>
                  <td className="px-3 py-3">
                    {u.suspended ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
                        Suspended
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.id !== session.userId ? (
                      <UserToggle userId={u.id} suspended={u.suspended} />
                    ) : (
                      <span className="text-xs text-slate-300">you</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        Suspension and reinstatement events are recorded in the tamper-evident
        audit trail. Entries submitted during a flagged burst remain
        UNDER_REVIEW until cleared by a System Moderator (SRS §4.4).
      </p>
    </div>
  );
}
