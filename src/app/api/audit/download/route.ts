import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { store } from "@/lib/store";

/** Audit trail download as CSV or JSON (SRS §5.3). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "audit_log")) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const fmt = searchParams.get("fmt") === "csv" ? "csv" : "json";
  const events = [...store.audit].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp)
  );

  if (fmt === "json") {
    return new NextResponse(JSON.stringify(events, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="lkc-audit-trail.json"`,
      },
    });
  }

  const header = "id,timestamp,actorId,actorRole,action,targetType,targetId,detail";
  const rows = events.map((e) =>
    [e.id, e.timestamp, e.actorId, e.actorRole, e.action, e.targetType, e.targetId ?? "", e.detail ?? ""]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(",")
  );
  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lkc-audit-trail.csv"`,
    },
  });
}
