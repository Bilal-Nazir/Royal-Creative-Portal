import { NextResponse, type NextRequest } from "next/server";
import { sessionService, SESSION_COOKIE_NAME, type SessionPayload } from "@/server/auth/session";

const CLIENT_PROTECTED_PREFIXES = ["/dashboard", "/messages", "/files", "/payments", "/projects"];
const AGENCY_PREFIX = "/agency";
const SIGN_IN_PATH = "/sign-in";
// Public guest routes — must stay reachable without a session.
const PUBLIC_PREFIXES = ["/b"];

function roleHome(session: SessionPayload): string {
  return session.role === "agency" ? "/agency/dashboard" : "/dashboard";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await sessionService.verify(token) : null;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(session ? roleHome(session) : SIGN_IN_PATH, request.url));
  }

  if (pathname === SIGN_IN_PATH) {
    if (session) {
      return NextResponse.redirect(new URL(roleHome(session), request.url));
    }
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!session) {
    const signInUrl = new URL(SIGN_IN_PATH, request.url);
    signInUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const isAgencyRoute = pathname === AGENCY_PREFIX || pathname.startsWith(`${AGENCY_PREFIX}/`);
  const isClientRoute = CLIENT_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAgencyRoute && session.role !== "agency") {
    return NextResponse.redirect(new URL(roleHome(session), request.url));
  }

  if (isClientRoute && session.role !== "client") {
    return NextResponse.redirect(new URL(roleHome(session), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|brand|icons|favicon.ico).*)"],
};
