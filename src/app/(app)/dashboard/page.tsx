import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, getSessionPayload } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import {
  fetchDashboard,
  type ArchitectData,
  type ChiefData,
  type ContributorData,
  type CuratorData,
  type EditorData,
  type ModeratorData,
} from "@/lib/dashboard";
import { PageTitle } from "@/components/ui";
import { ArchitectDashboard, ModeratorDashboard } from "@/components/dashboard/AdminDashboards";
import { ChiefDashboard, EditorDashboard } from "@/components/dashboard/EditorialDashboards";
import { ContributorDashboard, CuratorDashboard } from "@/components/dashboard/CommunityDashboards";
import { DashboardUnavailable } from "@/components/dashboard/DashboardParts";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [payload, data] = await Promise.all([getSessionPayload(), fetchDashboard<unknown>()]);
  const displayName = payload?.profile.name ?? session.name;
  // Relative times are measured from the moment the API built the dashboard.
  const generatedAt = (data as { generatedAt?: unknown } | null)?.generatedAt;
  const now = typeof generatedAt === "string" ? Date.parse(generatedAt) || 0 : 0;

  const body = (() => {
    if (!data) return <DashboardUnavailable />;
    switch (session.role) {
      case "PLATFORM_ARCHITECT":
        return <ArchitectDashboard session={session} data={data as ArchitectData} />;
      case "SYSTEM_MODERATOR":
        return <ModeratorDashboard session={session} data={data as ModeratorData} now={now} />;
      case "CONTRIBUTOR":
        return <ContributorDashboard session={session} data={data as ContributorData} now={now} />;
      case "LEXICAL_EDITOR":
        return <EditorDashboard session={session} data={data as EditorData} now={now} />;
      case "CHIEF_LEXICAL_EDITOR":
        return <ChiefDashboard session={session} data={data as ChiefData} now={now} />;
      case "ARBITRATION_CURATOR":
        return <CuratorDashboard session={session} data={data as CuratorData} now={now} />;
    }
  })();

  return (
    <div className="mx-auto max-w-7xl">
      <PageTitle title={`${ROLE_LABEL[session.role]} Dashboard`} subtitle={`Welcome back, ${displayName}.`} />
      {body}
    </div>
  );
}
