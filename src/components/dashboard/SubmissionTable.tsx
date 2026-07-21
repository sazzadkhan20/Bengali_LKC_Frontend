import Link from "next/link";
import type { Submission } from "@/lib/types";
import { userById } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { PosBadge, StateBadge } from "@/components/ui";

export function SubmissionTable({
  submissions,
  emptyMessage = "Nothing here yet.",
}: {
  submissions: Submission[];
  emptyMessage?: string;
}) {
  if (submissions.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm italic text-slate-400">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-semibold">Word</th>
            <th className="px-3 py-3 font-semibold">POS</th>
            <th className="px-3 py-3 font-semibold">State</th>
            <th className="px-3 py-3 font-semibold">Contributor</th>
            <th className="px-3 py-3 font-semibold">Updated</th>
            <th className="px-5 py-3 text-right font-semibold">Action</th>
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
                <span className="ml-2 font-mono text-[10px] text-slate-300">
                  {s.id}
                </span>
              </td>
              <td className="px-3 py-3">
                <PosBadge pos={s.pos} full={false} />
              </td>
              <td className="px-3 py-3">
                <StateBadge state={s.state} />
              </td>
              <td className="px-3 py-3 text-xs text-slate-500">
                {userById(s.contributorId)?.name ?? s.contributorId}
              </td>
              <td className="px-3 py-3 text-xs text-slate-400">
                {timeAgo(s.updatedAt)}
              </td>
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
  );
}
