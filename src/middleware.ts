import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function middleware(request: NextRequest) {
  const authRes = await auth0.middleware(request);

  // Let Auth0's own routes (/auth/login, /auth/callback, etc.) pass through.
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return authRes;
  }

  // Protect /app/* — must be authenticated.
  if (request.nextUrl.pathname.startsWith("/app")) {
    const session = await auth0.getSession(request);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("returnTo", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return authRes;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
