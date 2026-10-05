import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { backendAuthedFetch } from "@/lib/backend-auth";
import { EmptyState, PageTitle, Pagination } from "@/components/ui";
import { ApplicationCard, type Application, type ApplicationStatus } from "@/components/dashboard/ApplicationReview";

export const metadata: Metadata = { title: "Contributor Applications" };
export const dynamic = "force-dynamic";

type Filter = ApplicationStatus | "ALL";

type ListResponse = {
  items: Application[];
  status: Filter;
  q: string;
  counts: Record<Filter, number>;
  page: number;
  size: number;
  total: number;
  totalPages: number;
  error?: string;
};

const TABS: { value: Filter; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const PAGE_SIZE = 10;

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; q?: string | string[]; page?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "manage_credentials")) redirect("/dashboard");

  const sp = await searchParams;
  const rawStatus = one(sp.status).toUpperCase();
  const status: Filter = TABS.some((t) => t.value === rawStatus) ? (rawStatus as Filter) : "NEW";
  const q = one(sp.q).slice(0, 100);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const qs = new URLSearchParams({ status, page: String(page), size: String(PAGE_SIZE) });
  if (q) qs.set("q", q);

  let data: ListResponse | null = null;
  let error: string | null = null;
  try {
    const res = await backendAuthedFetch<ListResponse>(`/api/applications?${qs.toString()}`);
    if (res.status === 401) redirect("/login");
    if (res.ok) data = res.data;
    else error = res.status >= 500 ? "The application service is unavailable. Try again shortly." : res.data.error ?? "Could not load applications.";
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    error = "The application service is unavailable. Try again shortly.";
  }

  const hrefFor = (next: { status?: Filter; page?: number; q?: string }) => {
    const p = new URLSearchParams();
    const s = next.status ?? status;
    if (s !== "NEW") p.set("status", s);
    const query = next.q ?? q;
    if (query) p.set("q", query);
    if (next.page && next.page > 1) p.set("page", String(next.page));
    const str = p.toString();
    return `/dashboard/applications${str ? `?${str}` : ""}`;
  };

  const from = data && data.total > 0 ? (data.page - 1) * data.size + 1 : 0;
  const to = data ? Math.min(data.page * data.size, data.total) : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Contributor Applications"
        subtitle="Requests sent from the public “Apply to contribute” form. Approve one to issue a login account prefilled from the request, or reject it with a note for the applicant."
      />

      <nav aria-label="Application status" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:flex sm:w-fit">
        {TABS.map((t) => {
          const active = t.value === status;
          const count = data?.counts?.[t.value];
          return (
            <Link
              key={t.value}
              href={hrefFor({ status: t.value, page: 1 })}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
              {typeof count === "number" ? (
                <span
                  className={`rounded-full px-1.5 text-[11px] font-bold ${
                    t.value === "NEW" && count > 0 ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <form action="/dashboard/applications" method="get" className="mb-5 flex flex-col gap-2 sm:flex-row">
        {status !== "NEW" ? <input type="hidden" name="status" value={status} /> : null}
        <label htmlFor="applications-q" className="sr-only">
          Search applications
        </label>
        <input
          id="applications-q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Search by name, email, institution or application id"
          className="w-full min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:flex-none"
          >
            Search
          </button>
          {q ? (
            <Link
              href={hrefFor({ q: "", page: 1 })}
              className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 sm:flex-none"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title={q ? "No applications match your search" : status === "NEW" ? "No applications waiting" : "No applications here yet"}
          message={
            q
              ? "Try a different name, email or institution, or clear the search."
              : status === "NEW"
                ? "New requests from the public contribute form will appear here."
                : undefined
          }
        />
      ) : data ? (
        <>
          <p className="mb-3 text-xs text-slate-500">
            Showing {from}–{to} of {data.total}
          </p>
          <div className="space-y-4">
            {data.items.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => hrefFor({ page: p })} />
        </>
      ) : null}
    </div>
  );
}
