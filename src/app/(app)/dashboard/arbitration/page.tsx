import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { ArbitrationBrowser, type ArbitrationViewer } from "@/components/dashboard/ArbitrationBrowser";
import type { CasePhase } from "@/lib/arbitration";
import type { Role } from "@/lib/types";

export const metadata: Metadata = { title: "Arbitration" };

const VIEWER: Partial<Record<Role, ArbitrationViewer>> = {
  ARBITRATION_CURATOR: "curator",
  PLATFORM_ARCHITECT: "manager",
  SYSTEM_MODERATOR: "manager",
  CONTRIBUTOR: "contributor",
  LEXICAL_EDITOR: "reviewer",
  CHIEF_LEXICAL_EDITOR: "reviewer",
};

const COPY: Record<ArbitrationViewer, { title: string; subtitle: string }> = {
  curator: {
    title: "Arbitration Cases",
    subtitle:
      "Every entry under arbitration. Each side has 72 hours to submit a note; once both are in and the window closes, the panel votes for 7 days. A two-thirds quorum decides the case, otherwise voting is extended.",
  },
  manager: {
    title: "Arbitration Oversight",
    subtitle:
      "Read-only view of every arbitration case, its notes, deadlines and panel progress. Deadlines are processed by the daily check at 10:00 (Dhaka).",
  },
  contributor: {
    title: "My Disputes",
    subtitle:
      "Arbitration cases on your entries. Submit or update your note until the 72-hour response window is closed by the daily check.",
  },
  reviewer: {
    title: "My Escalations & Disputes",
    subtitle:
      "Arbitration cases on your review decisions. Submit or update your note until the 72-hour response window is closed by the daily check.",
  },
};

const PHASES: CasePhase[] = ["OPEN", "RESPONSE_WINDOW", "ACTIVE", "TIE_PENDING", "RESOLVED", "ALL"];

export default async function ArbitrationListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; phase?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const viewer = VIEWER[session.role];
  if (!viewer) redirect("/dashboard");
  const sp = await searchParams;
  const phase = PHASES.find((p) => p === sp.phase?.toUpperCase()) ?? "OPEN";

  return (
    <div className="mx-auto max-w-7xl">
      <PageTitle
        title={COPY[viewer].title}
        subtitle={
          hasPermission(session.role, "tie_breaker")
            ? "Every arbitration case, its notes, deadlines and panel progress. Tied cases wait for you: open one, correct the entry and validate it to close the case. Deadlines are processed by the daily check at 10:00 (Dhaka)."
            : COPY[viewer].subtitle
        }
      />
      <ArbitrationBrowser viewer={viewer} initialQuery={sp.q ?? ""} initialPhase={phase} />
    </div>
  );
}
