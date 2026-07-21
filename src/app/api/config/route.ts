import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { recordAudit, store } from "@/lib/store";
import type { SystemConfig } from "@/lib/types";

/** System configuration update — Platform Architect only (SRS §7.1.2). */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "system_config")) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const p = (await req.json().catch(() => ({}))) as Partial<SystemConfig>;
  const numeric: (keyof SystemConfig)[] = [
    "maxEntriesPerSession",
    "maxEntriesPerDay",
    "suspensionThreshold",
    "minSubmissionSeconds",
    "anomalyThresholdPerHour",
    "ipRequestsPerMinute",
    "sessionTimeoutMinutes",
    "captchaScoreThreshold",
    "passwordMinLength",
    "rewardPointPerEntry",
    "tierGoldMin",
    "tierSilverMin",
    "tierBronzeMin",
  ];
  for (const key of numeric) {
    const v = p[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      (store.config[key] as number) = v;
    }
  }
  if (typeof p.captchaEnabled === "boolean")
    store.config.captchaEnabled = p.captchaEnabled;
  if (typeof p.honeypotEnabled === "boolean")
    store.config.honeypotEnabled = p.honeypotEnabled;

  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: "CONFIG_UPDATED",
    targetType: "CONFIG",
    detail: JSON.stringify(store.config),
  });
  return NextResponse.json({ ok: true, config: store.config });
}
