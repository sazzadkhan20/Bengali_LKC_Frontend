import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { store } from "@/lib/store";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Change Password" };

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {session.mustChangePassword ? "Set a new password" : "Change your password"}
      </h1>
      {session.mustChangePassword ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          You signed in with a system-generated one-time password. You must
          set a new password before you can access any other part of the
          platform (SRS §3.2). The one-time password is invalidated the
          instant your new password is confirmed.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Choose a new password for your account. The change is recorded in
          the tamper-evident audit trail.
        </p>
      )}
      <div className="mt-8">
        <ChangePasswordForm
          minLength={store.config.passwordMinLength}
          firstLogin={Boolean(session.mustChangePassword)}
        />
      </div>
    </div>
  );
}
