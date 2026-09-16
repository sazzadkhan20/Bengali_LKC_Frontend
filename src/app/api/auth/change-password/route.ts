import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";
import { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies } from "@/lib/auth-cookies";

type AuthBody = Record<string, unknown> & {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
};

export async function POST(req: Request) {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const result = await backendFetch<AuthBody>("/api/auth/change-password", {
      method: "POST",
      accessToken: access,
      refreshToken: jar.get(REFRESH_COOKIE)?.value,
      body: JSON.stringify(body),
    });
    const res = NextResponse.json(result.data, { status: result.status });
    if (result.ok && typeof result.data.accessToken === "string") {
      setAuthCookies(res, {
        accessToken: result.data.accessToken,
        refreshToken:
          typeof result.data.refreshToken === "string"
            ? result.data.refreshToken
            : undefined,
        expiresIn: typeof result.data.expiresIn === "number" ? result.data.expiresIn : 3600,
      });
    }
    return res;
  } catch (err) {
    console.error("[auth/change-password]", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 }
    );
  }
}
