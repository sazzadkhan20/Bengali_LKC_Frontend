import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/backend-auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await backendAuthedFetch(`/api/credentials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return result.response;
  } catch (err) {
    console.error("[credentials PATCH]", err);
    return NextResponse.json({ error: "Credential service unavailable." }, { status: 503 });
  }
}
