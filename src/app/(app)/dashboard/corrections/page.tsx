import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { store, userById } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageTitle } from "@/components/ui";
import { CaseButton } from "@/components/dashboard/ArbitrationActions";

export const metadata: Metadata = { title: "Pending Corrections" };

export default async function CorrectionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "apply_corrections")) redirect("/dashboard");

  const pending = store.cases.filter(
    (c) => c.status === "RESOLVED" && c.correctionNote && !c.correctionApplied
  );
  const applied = store.cases.filter(
    (c) => c.correctionApplied && c.correctionNote
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Pending Corrections"
        subtitle="VALIDATED entries approved by the Arbitration panel with a correction note. Apply the minimal correction and confirm."
      />

      {pending.length === 0 ? (
        <EmptyState
          title="No corrections pending"
          message="When a curator attaches a correction note to an approving vote, it appears here after the verdict."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((c) => {
            const sub = store.submissions.find((s) => s.id === c.submissionId);
            return (
              <Card key={c.id}>
                <div className="flex flex-wrap items-center gap-3 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/submissions/${sub?.id}`}
                        className="font-bengali text-lg font-bold text-slate-800 hover:text-emerald-700"
                      >
                        {sub?.writtenForm}
                      </Link>
                      <span className="font-mono text-[10px] text-slate-300">
                        {c.id}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      🩹 {c.correctionNote}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Verdict {c.finalVerdict?.replaceAll("_", " ").toLowerCase()} ·
                      resolved {c.resolvedAt ? formatDateTime(c.resolvedAt) : ""}
                    </p>
                  </div>
                  <CaseButton
                    caseId={c.id}
                    action="apply_correction"
                    label="Mark as Applied"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {applied.length > 0 ? (
        <Card className="mt-8">
          <CardHeader title="Previously applied corrections" />
          <ul className="divide-y divide-slate-50">
            {applied.map((c) => {
              const sub = store.submissions.find((s) => s.id === c.submissionId);
              return (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="font-bengali font-semibold">{sub?.writtenForm}</span>
                  <span className="text-xs text-slate-400">{c.correctionNote}</span>
                  <span className="ml-auto text-xs text-emerald-600">✓ applied by {userById(session.userId)?.name}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
