import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "nextlevel_auth";

const legacyRouteMap: Record<string, string> = {
  "/dashboard": "/app/dashboard",
  "/missions": "/app/missions",
  "/inventory": "/app/inventory",
  "/shop": "/app/shop",
  "/character": "/app/character",
  "/battle": "/app/battle",
  "/map": "/app/missions",
};

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const legacyTarget = legacyRouteMap[pathname];
  if (legacyTarget) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyTarget;
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/app" || pathname.startsWith("/app/") || pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isAuthenticated = request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";

    if (!isAuthenticated) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";

      const requestedPath = `${pathname}${search}`;
      if (requestedPath !== "/app" && requestedPath !== "/app/" && requestedPath !== "/admin" && requestedPath !== "/admin/") {
        loginUrl.searchParams.set("next", requestedPath);
      }

      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app",
    "/app/:path*",
    "/admin",
    "/admin/:path*",
    "/dashboard",
    "/missions",
    "/inventory",
    "/shop",
    "/character",
    "/battle",
    "/map",
  ],
};
