import { auth } from "@/lib/auth";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

const intlMiddleware = createMiddleware(routing);

const publicRoutes = ["/login", "/api/auth"];

// Build locale pattern dynamically from routing config so it stays in sync
const localeSegment = routing.locales.join("|");
const localePattern = new RegExp(`^\\/(${localeSegment})(\\/|$)`);

function extractLocale(pathname: string): string {
  const m = pathname.match(new RegExp(`^\\/(${localeSegment})`));
  return m ? m[1] : routing.defaultLocale;
}

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cron routes: require the shared secret header
  if (pathname.startsWith("/api/cron/")) {
    const secret = request.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const pathWithoutLocale = pathname.replace(localePattern, "/");

  const isPublic = publicRoutes.some(
    (r) => pathWithoutLocale === r || pathWithoutLocale.startsWith(r + "/")
  );

  if (!isPublic && !pathname.startsWith("/api/")) {
    const session = (request as NextRequest & { auth: Session | null }).auth;

    if (!session) {
      const locale = extractLocale(pathname);
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = session.user?.role;
    const isAdminRoute = pathWithoutLocale.startsWith("/admin");
    const isManagerRoute = pathWithoutLocale.startsWith("/manager");

    if (isAdminRoute && role !== "ADMIN") {
      const locale = extractLocale(pathname);
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    if (isManagerRoute && role !== "MANAGER" && role !== "ADMIN") {
      const locale = extractLocale(pathname);
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    return intlMiddleware(request) ?? NextResponse.next();
  }

  if (!pathname.startsWith("/api/")) {
    return intlMiddleware(request);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
