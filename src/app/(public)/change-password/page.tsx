import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ChangePasswordPageContent } from "./ChangePasswordPageContent";

export const metadata: Metadata = { title: "Change Password" };

/** Matches backend system_config.password_min_length default (SRS §3.2). */
const PASSWORD_MIN_LENGTH = 10;

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <ChangePasswordPageContent
      mustChange={Boolean(session.mustChangePassword)}
      minLength={PASSWORD_MIN_LENGTH}
    />
  );
}
