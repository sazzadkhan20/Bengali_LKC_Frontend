import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { store } from "@/lib/store";
import { ChangePasswordPageContent } from "./ChangePasswordPageContent";

export const metadata: Metadata = { title: "Change Password" };

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <ChangePasswordPageContent
      mustChange={Boolean(session.mustChangePassword)}
      minLength={store.config.passwordMinLength}
    />
  );
}
