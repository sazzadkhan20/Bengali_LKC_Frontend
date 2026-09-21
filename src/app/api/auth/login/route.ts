import { NextResponse } from "next/server";
import { proxyLogin } from "@/lib/auth-proxy";

/**
 * Credential-based authentication — proxies to the Spring Boot API.
 * Access + refresh tokens are stored as httpOnly cookies on the frontend origin.
 */
export async function POST(req: Request) {
  const { username, password } = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  if (!username || typeof username !== "string" || !password || typeof password !== "string") {
    return NextResponse.json(
      {
        errors: {
          ...(!username || typeof username !== "string"
            ? { username: "Enter your username or email address." }
            : {}),
          ...(!password || typeof password !== "string"
            ? { password: "Enter your password." }
            : {}),
        },
      },
      { status: 400 }
    );
  }

  try {
    return await proxyLogin(username, password);
  } catch (err) {
    console.error("[auth/login] backend unreachable", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again shortly." },
      { status: 503 }
    );
  }
}
