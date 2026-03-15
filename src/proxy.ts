import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  console.log("[proxy]", request.nextUrl.pathname, "secret length:", secret?.length, "AUTH_SECRET?", !!process.env.AUTH_SECRET, "NEXTAUTH_SECRET?", !!process.env.NEXTAUTH_SECRET);

  const token = await getToken({
    req: request,
    secret,
  });

  console.log("[proxy]", request.nextUrl.pathname, "token?", !!token);

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/forms|api/auth|api/cron|api/queues|api/webhooks|api/unsubscribe|login|register|forgot-password|reset-password|_next/static|_next/image|favicon.ico).*)",
  ],
};
