import { auth } from "@/lib/auth";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow cron routes only with the secret header
  if (pathname.startsWith("/api/cron/")) {
    const secret = request.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Strip locale prefix to check the raw path
  const localePattern = /^\/(en|he|ar|fr)(\/|$)/;
  const pathWithoutLocale = pathname.replace(localePattern, "/");

  const isPublic = publicRoutes.some(
    (r) => pathWithoutLocale === r || pathWithoutLocale.startsWith(r + "/")
  );

  if (!isPublic && !pathname.startsWith("/api/")) {
    // Apply next-intl locale routing for page routes
    const intlResponse = intlMiddleware(request);

    // Check auth
    const session = await auth();
    if (!session) {
      // Detect locale from URL for redirect
      const localeMatch = pathname.match(/^\/(en|he|ar|fr)/);
      const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role guard: /admin routes require ADMIN or MANAGER
    const isAdminRoute = pathWithoutLocale.startsWith("/admin");
    const isManagerRoute = pathWithoutLocale.startsWith("/manager");
    const role = session.user.role;

    if (isAdminRoute && role !== "ADMIN") {
      const localeMatch = pathname.match(/^\/(en|he|ar|fr)/);
      const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    if (isManagerRoute && role !== "MANAGER" && role !== "ADMIN") {
      const localeMatch = pathname.match(/^\/(en|he|ar|fr)/);
      const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    return intlResponse ?? NextResponse.next();
  }

  // For public page routes, still apply locale middleware
  if (!pathname.startsWith("/api/")) {
    return intlMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
