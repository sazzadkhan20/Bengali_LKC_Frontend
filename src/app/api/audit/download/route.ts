import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

const FILTER_KEYS = ["type", "action", "actor", "q", "from", "to"] as const;

/** Audit trail export (CSV or JSON) with the same filters as the Audit Log page. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fmt = searchParams.get("fmt") === "csv" ? "csv" : "json";
    const qs = new URLSearchParams({ fmt });
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) qs.set(key, value);
    }
    const result = await backendAuthedFetch<unknown>(`/api/audit/download?${qs}`);
    if (!result.ok) return result.response;

    // backendFetch keeps non-JSON bodies under `error` and drops the UTF-8 BOM Excel needs for Bengali text.
    const body =
      fmt === "csv"
        ? "\uFEFF" + String((result.data as { error?: unknown }).error ?? "").replace(/^\uFEFF/, "")
        : JSON.stringify(result.data, null, 2);
    const stamp = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    const response = new NextResponse(body, {
      headers: {
        "Content-Type": fmt === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="lkc-audit-trail-${stamp}.${fmt}"`,
        "Cache-Control": "no-store",
      },
    });
    for (const cookie of result.response.cookies.getAll()) response.cookies.set(cookie);
    return response;
  } catch (err) {
    console.error("[audit-download]", err);
    return NextResponse.json({ error: "Audit service unavailable." }, { status: 503 });
  }
}
