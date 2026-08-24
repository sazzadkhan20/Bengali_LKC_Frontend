import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { ContributeApplication } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Bot honeypot — silently accept but do not store.
  if (typeof body.honeypot === "string" && body.honeypot.trim()) {
    return NextResponse.json({ ok: true, id: "ignored" });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const institution = String(body.institution ?? "").trim();
  const interestRole = String(body.interestRole ?? "").trim();
  const message = String(body.message ?? "").trim();

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Please enter your full name.";
  if (name.length > 80) errors.name = "Name is too long.";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (phone.length < 6) errors.phone = "Enter a reachable phone number.";
  if (phone.length > 30) errors.phone = "Phone number is too long.";
  if (message.length < 20)
    errors.message = "Please explain why you want to join (at least 20 characters).";
  if (message.length > 800) errors.message = "Message must be at most 800 characters.";
  if (institution.length > 120)
    errors.institution = "Institution name is too long.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  // Ensure store field exists for long-lived hot-reload sessions
  if (!Array.isArray(store.contributeApplications)) {
    store.contributeApplications = [];
  }
  if (typeof store.counters.contribute !== "number") {
    store.counters.contribute = store.contributeApplications.length + 1;
  }

  const recent = store.contributeApplications.filter(
    (a) => a.email === email && Date.now() - new Date(a.createdAt).getTime() < 24 * 3600 * 1000
  );
  if (recent.length >= 3) {
    return NextResponse.json(
      {
        error:
          "Too many requests from this email in the last 24 hours. Please wait before submitting again.",
      },
      { status: 429 }
    );
  }

  const app: ContributeApplication = {
    id: `contrib-${store.counters.contribute++}`,
    name,
    email,
    phone,
    institution: institution || undefined,
    interestRole: interestRole || undefined,
    message,
    createdAt: new Date().toISOString(),
    status: "NEW",
  };
  store.contributeApplications.push(app);

  return NextResponse.json({
    ok: true,
    id: app.id,
    message:
      "Your contribution request was recorded. The Platform Architect will contact you by email if a role is available.",
  });
}
