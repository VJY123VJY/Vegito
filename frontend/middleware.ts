import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static resources and internals: allow through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Admin Command Center routes and unauthorized page: allow through
  if (
    pathname.startsWith("/admin") ||
    pathname === "/unauthorized" ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // 3. Strict Platform Separation:
  // Non-admin workflows (customer shopping, seller operations, delivery partner)
  // are strictly hosted on the Vegito Native Android App.
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/unauthorized";
  redirectUrl.searchParams.set("reason", "platform_separation");
  redirectUrl.searchParams.set("from", pathname);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
