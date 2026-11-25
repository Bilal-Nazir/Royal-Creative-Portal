import { NextResponse, type NextRequest } from "next/server";
import { sessionService, SESSION_COOKIE_NAME, type SessionPayload } from "@/server/auth/session";

const CLIENT_PROTECTED_PREFIXES = ["/dashboard", "/messages", "/files", "/payments", "/projects"];
const AGENCY_PREFIX = "/agency";
const SIGN_IN_PATH = "/sign-in";
// Public guest routes — must stay reachable without a session.
const PUBLIC_PREFIXES = ["/b", "/invite", "/forgot-password", "/reset-password"];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function roleHome(session: SessionPayload): string {
  return session.role === "agency" ? "/agency/dashboard" : "/dashboard";
}

/**
 * CSRF: every mutating API request's Origin must match this app's host — a
 * cross-site form/fetch can't carry a matching Origin header. Compared by
 * host only (not full origin string with scheme): behind a CDN like
 * CloudFront, `request.nextUrl`'s protocol can reflect the internal
 * edge-to-origin hop (often http) rather than the public https URL the
 * browser actually used, so a scheme-sensitive comparison rejects
 * legitimate same-site requests.
 */
function hasValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestHost = request.headers.get("host") ?? request.nextUrl.host;
  try {
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle their own auth/session checks per-route (they return
  // JSON 401s, not sign-in redirects) — proxy only adds the CSRF gate here,
  // then gets out of the way. /api/dev/demo-state is exempt: it's already a
  // documented test-only fixture control (gated on NODE_ENV/ALLOW_DEMO_STATE,
  // no session check at all by design — see its route handler) that
  // Playwright calls directly via request.post(), which doesn't carry a
  // browser Origin header the way a real page's fetch() does.
  if (pathname.startsWith("/api/")) {
    const isExempt = pathname === "/api/dev/demo-state";
    if (!isExempt && MUTATING_METHODS.has(request.method) && !hasValidOrigin(request)) {
      return NextResponse.json({ ok: false, error: "Request origin not allowed." }, { status: 403 });
    }
    return NextResponse.next();
  }

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
  matcher: ["/((?!_next|api|brand|icons|favicon.ico).*)", "/api/:path*"],
};
