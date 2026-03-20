import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/token";

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname === "/api/auth/login";
}

function isPasswordManagementPath(pathname: string) {
  return (
    pathname === "/change-password" ||
    pathname === "/api/auth/change-password" ||
    pathname === "/api/auth/logout"
  );
}

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/analysis") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname) && !isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isApiRequest = pathname.startsWith("/api");

  let payload = null;

  if (token) {
    try {
      payload = await verifySessionToken(token);
    } catch {
      payload = null;
    }
  }

  if (isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    if (payload) {
      return NextResponse.redirect(
        new URL(payload.mustChangePassword ? "/change-password" : "/dashboard", request.url),
      );
    }

    return NextResponse.next();
  }

  if (!payload) {
    if (isApiRequest) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (payload.mustChangePassword && !isPasswordManagementPath(pathname)) {
    if (isApiRequest) {
      return NextResponse.json(
        { error: "Troque sua senha inicial antes de continuar." },
        { status: 403 },
      );
    }

    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  if (pathname.startsWith("/admin") && payload.role !== "admin") {
    if (isApiRequest) {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)"],
};
