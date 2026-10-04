import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { formatNumber, POS_LABEL, STATE_LABEL, timeAgo } from "@/lib/format";
import { Card, CardHeader, PageTitle, StatCard } from "@/components/ui";
import { BarList, ColumnChart, DonutChart, type ChartDatum } from "@/components/charts";
import { DashboardUnavailable, EmptyRow, formatAge } from "@/components/dashboard/DashboardParts";
import type { EntryState, POS } from "@/lib/types";

export const metadata: Metadata = { title: "Data Statistics" };
export const dynamic = "force-dynamic";

const STATE_COLORS: Record<EntryState, string> = {
  DRAFT: "#848870",
  PENDING_REVIEW: "#3b6b88",
  UNDER_REVIEW: "#a0733a",
  FLAGGED: "#886620",
  C_FLAGGED: "#a85070",
  EDITOR_APPROVED: "#7a667a",
  ARBITRATION: "#8b5cf6",
  VALIDATED: "#576139",
  REJECTED: "#884820",
};

const POS_COLORS: Record<POS, string> = { n: "#3b6b88", v: "#884820", a: "#886620", r: "#486830" };

type Statistics = {
  lexicon: {
    entries: number;
    crowdsourcedEntries: number;
    senses: number;
    synsets: number;
    crowdsourcedSynsets: number;
    definitionsBen: number;
    definitionsEng: number;
    polysemousEntries: number;
    synsetRelations: number;
    senseRelations: number;
    posDistribution: Record<POS, number>;
    synsetRelationCounts: Record<string, number>;
    senseRelationCounts: Record<string, number>;
  };
  counts: Record<EntryState, number>;
  totalSubmissions: number;
  submittedWeekly: ChartDatum[];
  validatedWeekly: ChartDatum[];
  contributors: number;
  topContributors: { userId: string; name: string; submitted: number; validated: number }[];
  outcomes: { validated: number; rejected: number; flagged: number; escalated: number; averageValidationHours: number };
  cases: { open: number; resolved: number; contributorUpheld: number; reviewerUpheld: number };
  generatedAt: string;
};

function relationData(counts: Record<string, number>): ChartDatum[] {
  return Object.entries(counts).map(([label, value]) => ({ label: label.replaceAll("_", " "), value }));
}

export default async function StatisticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "statistics")) redirect("/dashboard");

  const res = await backendAuthedFetch<Statistics>("/api/dashboard/stats", { cache: "no-store" });
  const data = res.ok ? res.data : null;

  return (
    <div className="mx-auto max-w-7xl">
      <PageTitle
        title="Data Statistics Dashboard"
        subtitle="Aggregate metrics across the canonical lexicon and the crowdsourcing pipeline."
      />
      {!data ? <DashboardUnavailable /> : <StatisticsBody data={data} />}
    </div>
  );
}

function StatisticsBody({ data }: { data: Statistics }) {
  const { lexicon, counts, outcomes, cases } = data;
  const decided = outcomes.validated + outcomes.rejected;
  const acceptance = decided > 0 ? Math.round((outcomes.validated / decided) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lexical entries"
          value={formatNumber(lexicon.entries)}
          hint={`${formatNumber(lexicon.crowdsourcedEntries)} added through the platform`}
        />
        <StatCard label="Word senses" value={formatNumber(lexicon.senses)} tone="blue" />
        <StatCard
          label="Synsets (concepts)"
          value={formatNumber(lexicon.synsets)}
          hint={`${formatNumber(lexicon.crowdsourcedSynsets)} added through the platform`}
          tone="purple"
        />
        <StatCard
          label="Semantic relations"
          value={formatNumber(lexicon.synsetRelations + lexicon.senseRelations)}
          hint={`${formatNumber(lexicon.synsetRelations)} synset · ${formatNumber(lexicon.senseRelations)} sense`}
          tone="green"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Crowdsourced entries by status"
            subtitle={`Current state of all ${formatNumber(data.totalSubmissions)} pipeline submissions`}
          />
          <div className="p-4 sm:p-5">
            {data.totalSubmissions === 0 ? (
              <p className="py-8 text-center text-sm italic text-slate-400">No submissions yet.</p>
            ) : (
              <DonutChart
                centreLabel="submissions"
                data={(Object.keys(counts) as EntryState[])
                  .filter((s) => counts[s] > 0)
                  .map((s) => ({ label: STATE_LABEL[s], value: counts[s], color: STATE_COLORS[s] }))}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Part-of-speech distribution" subtitle="Lexical entries by part of speech" />
          <div className="p-4 sm:p-5">
            <DonutChart
              centreLabel="entries"
              data={(Object.keys(lexicon.posDistribution) as POS[]).map((p) => ({
                label: POS_LABEL[p] ?? p,
                value: lexicon.posDistribution[p],
                color: POS_COLORS[p],
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Relation type distribution" subtitle="Synset-level and sense-level relations" />
          <div className="grid gap-6 p-4 sm:grid-cols-2 sm:p-5">
            <div className="min-w-0">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Synset relations</p>
              <BarList data={relationData(lexicon.synsetRelationCounts)} />
            </div>
            <div className="min-w-0">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Sense relations</p>
              <BarList data={relationData(lexicon.senseRelationCounts)} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contribution timeline" subtitle="Entries submitted per week (last 12 weeks)" />
          <div className="p-4 sm:p-5">
            <ColumnChart data={data.submittedWeekly} />
          </div>
          <CardHeader title="Validation timeline" subtitle="Entries validated per week (last 12 weeks)" />
          <div className="p-4 sm:p-5">
            <ColumnChart data={data.validatedWeekly} color="#486830" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Review outcomes" subtitle="All reviewer and panel decisions to date" />
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
            {[
              { label: "Validated", value: outcomes.validated, cls: "text-emerald-700" },
              { label: "Flagged", value: outcomes.flagged, cls: "text-amber-700" },
              { label: "Rejected", value: outcomes.rejected, cls: "text-red-700" },
              { label: "Escalated", value: outcomes.escalated, cls: "text-purple-700" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl bg-slate-50 p-3 text-center sm:p-4">
                <p className={`text-xl font-bold tabular-nums sm:text-2xl ${c.cls}`}>{formatNumber(c.value)}</p>
                <p className="text-[11px] text-slate-500 sm:text-xs">{c.label}</p>
              </div>
            ))}
          </div>
          <dl className="grid gap-3 border-t border-slate-100 px-4 py-4 text-sm sm:grid-cols-2 sm:px-5">
            <div>
              <dt className="text-xs text-slate-500">Acceptance rate</dt>
              <dd className="font-semibold text-slate-800">
                {acceptance === null ? "—" : `${acceptance}% of final decisions`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Average time to validation</dt>
              <dd className="font-semibold text-slate-800">
                {outcomes.validated > 0 ? formatAge(outcomes.averageValidationHours) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Arbitration cases</dt>
              <dd className="font-semibold text-slate-800">
                {cases.open} open · {cases.resolved} resolved
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Panel outcomes</dt>
              <dd className="font-semibold text-slate-800">
                {cases.contributorUpheld} contributor · {cases.reviewerUpheld} reviewer upheld
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Top contributors"
            subtitle={`${formatNumber(data.contributors)} contributor${data.contributors === 1 ? "" : "s"} have submitted entries`}
          />
          <ol className="divide-y divide-slate-50">
            {data.topContributors.length === 0 ? <EmptyRow>No submissions yet.</EmptyRow> : null}
            {data.topContributors.map((c, i) => (
              <li key={c.userId} className="flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5">
                <span className="w-6 shrink-0 text-center font-bold tabular-nums text-slate-300">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{c.name}</span>
                <span className="hidden shrink-0 text-xs tabular-nums text-slate-400 sm:inline">
                  {formatNumber(c.submitted)} submitted
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-700">
                  {formatNumber(c.validated)} validated
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Bengali definitions" value={formatNumber(lexicon.definitionsBen)} hint="synsets with a Bengali gloss" />
        <StatCard label="English definitions" value={formatNumber(lexicon.definitionsEng)} hint="synsets with an English gloss" />
        <StatCard label="Polysemous entries" value={formatNumber(lexicon.polysemousEntries)} hint="words with two or more senses" />
      </div>
      <p className="text-right text-xs text-slate-400">Updated {timeAgo(data.generatedAt)}</p>
    </div>
  );
}
