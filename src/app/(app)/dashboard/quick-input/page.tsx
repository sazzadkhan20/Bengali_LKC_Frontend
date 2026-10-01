import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { STATE_LABEL } from "@/lib/format";
import type { EntryState, POS } from "@/lib/types";
import { Card, PageTitle } from "@/components/ui";
import {
  QuickInputForm,
  type ResubmissionSource,
} from "@/components/dashboard/QuickInputForm";
import type { OwnerActions } from "@/components/dashboard/OwnerActionsPanel";

export const metadata: Metadata = { title: "Quick Input" };

type EntryDetail = {
  id: string;
  state: EntryState;
  version?: number | null;
  writtenForm: string;
  pos: POS;
  synsetAction: "link" | "create";
  synsetId: string | null;
  iliCode: string | null;
  definitionLanguage: "ben" | "eng" | null;
  definitionText: string | null;
  reviewerNote: string | null;
  editorComment: string | null;
  cleComment: string | null;
  synset?: {
    id: string;
    ili: string | null;
    pos: POS | null;
    definitionText: string | null;
    members: string[];
  };
  senseRelationDetails: { relType: string; target: string; writtenForm: string | null }[];
  synsetRelationDetails: { relType: string; target: string; members: string[] }[];
  ownerActions?: OwnerActions;
};

async function loadResubmission(
  id: string
): Promise<{ source: ResubmissionSource } | { error: string }> {
  const result = await backendAuthedFetch<EntryDetail>(`/api/submissions/${encodeURIComponent(id)}`);
  if (result.status === 401) redirect("/login");
  if (result.status === 404) return { error: `Entry ${id} was not found.` };
  if (result.status === 403) return { error: "You can only resubmit your own entries." };
  if (!result.ok) {
    return { error: (result.data as { error?: string }).error ?? "Could not load the entry. Please try again." };
  }
  const d = result.data;
  const resubmit = d.ownerActions?.actions.find((a) => a.action === "RESUBMIT");
  if (!d.ownerActions) return { error: "You can only resubmit your own entries." };
  if (!resubmit || (d.state !== "FLAGGED" && d.state !== "C_FLAGGED")) {
    return {
      error: `Entry ${d.id} is ${STATE_LABEL[d.state] ?? d.state}. Only flagged entries can be resubmitted.`,
    };
  }
  return {
    source: {
      id: d.id,
      version: d.version ?? null,
      state: d.state,
      targetState: resubmit.toState ?? "PENDING_REVIEW",
      feedback: d.state === "C_FLAGGED" ? d.cleComment : d.editorComment,
      writtenForm: d.writtenForm,
      pos: d.pos,
      synsetAction: d.synsetAction,
      synset:
        d.synsetAction === "link" && d.synset
          ? {
              id: d.synset.id,
              ili: d.synset.ili ?? "",
              pos: d.synset.pos ?? d.pos,
              definition: d.synset.definitionText ?? undefined,
              words: d.synset.members,
            }
          : null,
      iliCode: d.synsetAction === "create" ? d.iliCode : null,
      definitionLanguage: d.definitionLanguage ?? "ben",
      definitionText: d.definitionText ?? "",
      reviewerNote: d.reviewerNote ?? "",
      senseRelations: d.senseRelationDetails.map((r) => ({
        relType: r.relType,
        target: r.target,
        label: r.writtenForm ? `${r.writtenForm} (${r.target})` : r.target,
      })),
      synsetRelations: d.synsetRelationDetails.map((r) => ({
        relType: r.relType,
        target: r.target,
        label: `${r.members.join(", ") || r.target} (${r.target})`,
      })),
    },
  };
}

export default async function QuickInputPage({
  searchParams,
}: {
  searchParams: Promise<{ resubmit?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "quick_input")) redirect("/dashboard");

  const { resubmit } = await searchParams;
  const resubmitId = typeof resubmit === "string" ? resubmit.trim() : "";

  if (resubmitId) {
    const loaded = await loadResubmission(resubmitId);
    return (
      <div className="mx-auto max-w-4xl">
        <PageTitle
          title="Resubmit Entry — Correct and Resubmit"
          subtitle={
            "error" in loaded
              ? "This entry cannot be resubmitted right now."
              : "Your entry is loaded below. Address the reviewer's feedback, then resubmit it. Every field is validated exactly as a new Quick Input entry."
          }
        />
        {"error" in loaded ? (
          <Card className="p-6">
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {loaded.error}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
              <Link
                href={`/dashboard/submissions/${encodeURIComponent(resubmitId)}`}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                View entry
              </Link>
              <Link
                href="/dashboard/quick-input"
                className="rounded-xl bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800"
              >
                New entry instead
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <QuickInputForm
              key={`${loaded.source.id}-${loaded.source.version ?? ""}`}
              role={session.role}
              resubmission={loaded.source}
            />
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Quick Input — New Lexical Entry"
        subtitle="Enter a complete lexical record (word + POS + synset linkage + definition + relations) in a single submission. Bengali Unicode is supported natively. Lookups run against the full UKC lexicon."
      />
      {session.role === "CONTRIBUTOR" ? (
        <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
          Daily entry limits and minimum form time apply. Submissions that are
          too fast may be held under review by a System Moderator.
        </div>
      ) : null}
      <Card className="p-6">
        <QuickInputForm key="new" role={session.role} />
      </Card>
    </div>
  );
}
