import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { STATE_LABEL } from "@/lib/format";
import { reviewerTitle, STATUS_LABEL, type CaseDetail } from "@/lib/arbitration";
import type { EntryState, POS } from "@/lib/types";
import { Card, PageTitle } from "@/components/ui";
import {
  QuickInputForm,
  type CaptchaClientConfig,
  type ResubmissionSource,
} from "@/components/dashboard/QuickInputForm";
import type { OwnerActions } from "@/components/dashboard/OwnerActionsPanel";
import { fetchQuota } from "@/lib/dashboard";

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

async function loadCaptchaConfig(): Promise<CaptchaClientConfig | undefined> {
  const result = await backendAuthedFetch<CaptchaClientConfig>("/api/config/captcha", { cache: "no-store" });
  return result.ok ? result.data : undefined;
}

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
      ...entryFields(d),
      state: d.state,
      targetState: resubmit.toState ?? "PENDING_REVIEW",
      feedback: d.state === "C_FLAGGED" ? d.cleComment : d.editorComment,
    },
  };
}

/** The stored entry as Quick Input form values. */
function entryFields(d: EntryDetail) {
  return {
    id: d.id,
    version: d.version ?? null,
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
  } satisfies Partial<ResubmissionSource>;
}

async function loadTieCorrection(
  caseId: string
): Promise<{ source: ResubmissionSource } | { error: string; submissionId?: string }> {
  const caseResult = await backendAuthedFetch<CaseDetail>(`/api/arbitration/${encodeURIComponent(caseId)}`);
  if (caseResult.status === 401) redirect("/login");
  if (caseResult.status === 404) return { error: `Arbitration case ${caseId} was not found.` };
  if (!caseResult.ok) {
    return {
      error: (caseResult.data as { error?: string }).error ?? "Could not load the arbitration case. Please try again.",
    };
  }
  const c = caseResult.data;
  if (!c.viewer.canResolveTie) {
    return {
      submissionId: c.submission.id,
      error:
        c.status === "RESOLVED"
          ? `Case ${c.id} has already been resolved.`
          : c.status !== "TIE_PENDING"
            ? `Case ${c.id} is not tied (${STATUS_LABEL[c.status]}). Only tied cases are resolved here.`
            : `Entry ${c.submission.id} is no longer in arbitration, so case ${c.id} cannot be resolved here.`,
    };
  }
  const entryResult = await backendAuthedFetch<EntryDetail>(`/api/submissions/${encodeURIComponent(c.submission.id)}`);
  if (entryResult.status === 401) redirect("/login");
  if (!entryResult.ok) {
    return {
      submissionId: c.submission.id,
      error: (entryResult.data as { error?: string }).error ?? "Could not load the entry. Please try again.",
    };
  }
  const reviewerLabel = reviewerTitle(c.stage);
  return {
    source: {
      ...entryFields(entryResult.data),
      state: "ARBITRATION",
      targetState: "VALIDATED",
      feedback: null,
      tie: {
        caseId: c.id,
        reviewerLabel,
        contributorName: c.contributor.name ?? c.contributor.id,
        reviewerName: c.reviewer ? (c.reviewer.name ?? c.reviewer.id) : reviewerLabel,
        contributorNote: c.contributor.note,
        reviewerNote: c.reviewer?.note ?? null,
        contributorVotes: c.voting?.contributorVotes ?? 0,
        reviewerVotes: c.voting?.reviewerVotes ?? 0,
        votes: (c.voting?.votes ?? []).map((v) => ({
          curator: v.curator.name ?? v.curator.id,
          verdict: v.verdict,
          rationale: v.rationale,
        })),
      },
    },
  };
}

export default async function QuickInputPage({
  searchParams,
}: {
  searchParams: Promise<{ resubmit?: string | string[]; tieCase?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { resubmit, tieCase } = await searchParams;
  const tieCaseId = typeof tieCase === "string" ? tieCase.trim() : "";

  if (tieCaseId) {
    if (!hasPermission(session.role, "tie_breaker")) redirect(`/dashboard/arbitration/${encodeURIComponent(tieCaseId)}`);
    const loaded = await loadTieCorrection(tieCaseId);
    return (
      <div className="mx-auto max-w-4xl">
        <nav className="mb-4 text-xs text-slate-400">
          <Link href="/dashboard/arbitration" className="hover:text-violet-700">
            Arbitration
          </Link>{" "}
          /{" "}
          <Link href={`/dashboard/arbitration/${encodeURIComponent(tieCaseId)}`} className="font-mono hover:text-violet-700">
            {tieCaseId}
          </Link>{" "}
          / <span className="text-slate-600">Correct &amp; validate</span>
        </nav>
        <PageTitle
          title="Resolve Tie — Correct and Validate"
          subtitle={
            "error" in loaded
              ? "This case cannot be resolved right now."
              : "The tied entry is loaded below. Correct it where needed and validate it to close the case."
          }
        />
        {"error" in loaded ? (
          <Card className="p-6">
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {loaded.error}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
              <Link
                href={`/dashboard/arbitration/${encodeURIComponent(tieCaseId)}`}
                className="rounded-xl bg-violet-700 px-4 py-2 text-white hover:bg-violet-800"
              >
                View case
              </Link>
              {loaded.submissionId ? (
                <Link
                  href={`/dashboard/submissions/${encodeURIComponent(loaded.submissionId)}`}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  View entry
                </Link>
              ) : null}
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <QuickInputForm
              key={`tie-${loaded.source.id}-${loaded.source.version ?? ""}`}
              role={session.role}
              resubmission={loaded.source}
            />
          </Card>
        )}
      </div>
    );
  }

  if (!hasPermission(session.role, "quick_input")) redirect("/dashboard");
  const resubmitId = typeof resubmit === "string" ? resubmit.trim() : "";

  if (resubmitId) {
    const [loaded, captchaConfig] = await Promise.all([loadResubmission(resubmitId), loadCaptchaConfig()]);
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
              captchaConfig={captchaConfig}
            />
          </Card>
        )}
      </div>
    );
  }

  const exempt = session.role === "SYSTEM_MODERATOR" || session.role === "PLATFORM_ARCHITECT";
  const [captchaConfig, quota] = await Promise.all([
    loadCaptchaConfig(),
    exempt ? Promise.resolve(null) : fetchQuota(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Quick Input — New Lexical Entry"
        subtitle="Enter a complete lexical record (word + POS + synset linkage + definition + relations) in a single submission. Bengali Unicode is supported natively. Lookups run against the full UKC lexicon."
      />
      {quota ? (
        <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-800">
          <p className="font-semibold">
            This session: {quota.sessionUsed} of {quota.sessionLimit} entries · Last 24 hours: {quota.dayUsed} of{" "}
            {quota.dayLimit}
          </p>
          <p className="mt-0.5">
            Entries completed unusually fast, or more than {quota.anomalyThresholdPerHour} within an hour, are held under
            review by a System Moderator.
          </p>
        </div>
      ) : null}
      <Card className="p-6">
        <QuickInputForm key="new" role={session.role} captchaConfig={captchaConfig} />
      </Card>
    </div>
  );
}
