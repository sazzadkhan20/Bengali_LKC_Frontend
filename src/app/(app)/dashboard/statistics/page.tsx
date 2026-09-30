import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { lexiconStats } from "@/lib/lexicon";
import { countsByState, topContributors, weeklySubmissionSeries } from "@/lib/queries";
import { formatNumber, POS_LABEL, STATE_LABEL } from "@/lib/format";
import { Card, CardHeader, PageTitle, StatCard } from "@/components/ui";
import { BarList, ColumnChart, DonutChart } from "@/components/charts";
import type { EntryState, POS } from "@/lib/types";

export const metadata: Metadata = { title: "Data Statistics" };

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

export default async function StatisticsPage() {
  const session = await getSession();
  if (!session) redirect("/login"); // authenticated roles only

  const stats = lexiconStats();
  const counts = countsByState();
  const totalRelations =
    Object.values(stats.synsetRelationCounts).reduce((a, b) => a + b, 0) +
    Object.values(stats.senseRelationCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageTitle
        title="Data Statistics Dashboard"
        subtitle="Real-time aggregate metrics across the canonical lexicon and the crowdsourcing pipeline."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Canonical lexical entries" value={formatNumber(stats.totalEntries)} hint="from livelanguage-ben v1.0" />
        <StatCard label="Word senses" value={formatNumber(stats.totalSenses)} tone="blue" />
        <StatCard label="Synsets (concepts)" value={formatNumber(stats.totalSynsets)} tone="purple" />
        <StatCard label="Semantic relations" value={formatNumber(totalRelations)} tone="green" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Pipeline status donut */}
        <Card>
          <CardHeader
            title="Crowdsourced entries by status"
            subtitle="Current state of all pipeline submissions"
          />
          <div className="p-5">
            <DonutChart
              centreLabel="submissions"
              data={(Object.keys(counts) as EntryState[])
                .filter((s) => counts[s] > 0)
                .map((s) => ({
                  label: STATE_LABEL[s],
                  value: counts[s],
                  color: STATE_COLORS[s],
                }))}
            />
          </div>
        </Card>

        {/* POS distribution */}
        <Card>
          <CardHeader
            title="Part-of-speech distribution"
            subtitle="Canonical lexicon entries by POS"
          />
          <div className="p-5">
            <DonutChart
              centreLabel="entries"
              data={(Object.keys(stats.posDistribution) as POS[]).map(
                (p, i) => ({
                  label: POS_LABEL[p],
                  value: stats.posDistribution[p],
                  color: ["#3b6b88", "#884820", "#886620", "#486830"][i],
                })
              )}
            />
          </div>
        </Card>

        {/* Relation types */}
        <Card>
          <CardHeader
            title="Relation type distribution"
            subtitle="Synset-level and sense-level relations"
          />
          <div className="grid gap-6 p-5 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Synset relations
              </p>
              <BarList
                data={Object.entries(stats.synsetRelationCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, value]) => ({ label, value }))}
              />
            </div>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Sense relations
              </p>
              <BarList
                data={Object.entries(stats.senseRelationCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, value]) => ({ label, value }))}
              />
            </div>
          </div>
        </Card>

        {/* Contribution timeline + top contributors */}
        <Card>
          <CardHeader
            title="Contribution timeline"
            subtitle="Crowdsourced entries submitted per week (8 weeks)"
          />
          <div className="p-5">
            <ColumnChart data={weeklySubmissionSeries(8)} />
          </div>
          <CardHeader title="Top contributors" subtitle="By submitted and validated counts" />
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <tbody className="divide-y divide-slate-50">
                {topContributors().map((c, i) => (
                  <tr key={c.userId}>
                    <td className="w-10 px-4 py-2.5 font-bold text-slate-300 sm:px-5">{i + 1}</td>
                    <td className="max-w-[10rem] truncate py-2.5 font-medium text-slate-700 sm:max-w-none">{c.name}</td>
                    <td className="hidden py-2.5 text-right text-xs text-slate-400 sm:table-cell">{c.submitted} submitted</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-emerald-700 sm:px-5">{c.validated} validated</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Bengali definitions" value={formatNumber(stats.definitionsBen)} hint="synsets with a Bengali gloss" />
        <StatCard label="English definitions" value={formatNumber(stats.definitionsEng)} hint="synsets with an English gloss" />
        <StatCard label="Polysemous entries" value={formatNumber(stats.polysemousEntries)} hint="words with 2+ senses" />
      </div>
    </div>
  );
}
