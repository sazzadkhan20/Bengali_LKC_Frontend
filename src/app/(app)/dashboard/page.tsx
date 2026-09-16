import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, getSessionPayload } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import { PageTitle } from "@/components/ui";
import {
  ArchitectDashboard,
  ModeratorDashboard,
} from "@/components/dashboard/AdminDashboards";
import {
  ChiefDashboard,
  EditorDashboard,
} from "@/components/dashboard/EditorialDashboards";
import {
  ContributorDashboard,
  CuratorDashboard,
} from "@/components/dashboard/CommunityDashboards";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const payload = await getSessionPayload();
  const displayName = payload?.profile.name ?? session.name;

  const body = (() => {
    switch (session.role) {
      case "PLATFORM_ARCHITECT":
        return <ArchitectDashboard session={session} />;
      case "SYSTEM_MODERATOR":
        return <ModeratorDashboard session={session} />;
      case "CONTRIBUTOR":
        return <ContributorDashboard session={session} />;
      case "LEXICAL_EDITOR":
        return <EditorDashboard session={session} />;
      case "CHIEF_LEXICAL_EDITOR":
        return <ChiefDashboard session={session} />;
      case "ARBITRATION_CURATOR":
        return <CuratorDashboard session={session} />;
    }
  })();

  return (
    <div className="mx-auto max-w-7xl">
      <PageTitle
        title={`${ROLE_LABEL[session.role]} Dashboard`}
        subtitle={`Welcome back, ${displayName}.`}
      />
      {body}
    </div>
  );
}
