import Link from "next/link";
import type { DashSubmission } from "@/lib/dashboard";
import { timeAgo } from "@/lib/format";
import { PosBadge, StateBadge } from "@/components/ui";

export function SubmissionTable({
  submissions,
  emptyMessage = "Nothing here yet.",
  showContributor = true,
}: {
  submissions: DashSubmission[];
  emptyMessage?: string;
  showContributor?: boolean;
}) {
  if (submissions.length === 0) {
    return <p className="px-5 py-8 text-center text-sm italic text-slate-400">{emptyMessage}</p>;
  }
  return (
    <>
      <ul className="divide-y divide-slate-50 sm:hidden">
        {submissions.map((s) => (
          <li key={s.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/dashboard/submissions/${s.id}`}
                className="font-bengali min-w-0 text-base font-semibold text-slate-800 hover:text-emerald-700"
              >
                {s.writtenForm}
              </Link>
              <StateBadge state={s.state} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
              <PosBadge pos={s.pos} full={false} />
              <span className="font-mono">{s.id}</span>
              {showContributor ? <span>· {s.contributorName ?? s.contributorId}</span> : null}
              <span>· {timeAgo(s.updatedAt)}</span>
            </p>
          </li>
        ))}
      </ul>
      <div className="thin-scroll relative hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold">Word</th>
              <th className="px-3 py-3 font-semibold">POS</th>
              <th className="px-3 py-3 font-semibold">State</th>
              {showContributor ? <th className="px-3 py-3 font-semibold">Contributor</th> : null}
              <th className="px-3 py-3 font-semibold">Updated</th>
              <th className="px-5 py-3 text-right font-semibold">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {submissions.map((s) => (
              <tr key={s.id} className="transition hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <Link
                    href={`/dashboard/submissions/${s.id}`}
                    className="font-bengali text-base font-semibold text-slate-800 hover:text-emerald-700"
                  >
                    {s.writtenForm}
                  </Link>
                  <span className="ml-2 font-mono text-[10px] text-slate-400">{s.id}</span>
                </td>
                <td className="px-3 py-3">
                  <PosBadge pos={s.pos} full={false} />
                </td>
                <td className="px-3 py-3">
                  <StateBadge state={s.state} />
                </td>
                {showContributor ? (
                  <td className="px-3 py-3 text-xs text-slate-500">{s.contributorName ?? s.contributorId}</td>
                ) : null}
                <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-400">{timeAgo(s.updatedAt)}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/dashboard/submissions/${s.id}`}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
