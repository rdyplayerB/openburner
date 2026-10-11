import { NextRequest, NextResponse } from "next/server";

/**
 * Origin guard for every /api route. The app only calls its own API from the
 * same origin, so other websites are refused and no CORS headers are sent.
 *
 * Allowed:
 *  - Sec-Fetch-Site: same-origin (or none — the user typed the URL)
 *  - Origin equal to this deployment's own origin
 *  - Origin listed in ALLOWED_ORIGINS (comma-separated)
 *  - No Origin/Sec-Fetch-Site but a same-origin Referer (older browsers)
 *  - In local mode only: requests with no browser headers (curl, scripts)
 *
 * Header checks stop other websites in a browser; they can't stop a script that
 * forges headers. Rate limits and daily caps (lib/rate-limit.ts) handle that.
 */

const isHosted = process.env.NEXT_PUBLIC_APP_MODE === "hosted";

function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
}

export function middleware(req: NextRequest) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
  }

  const site = req.headers.get("sec-fetch-site");
  const origin = req.headers.get("origin");

  if (origin) {
    if (origin === req.nextUrl.origin || allowedOrigins().includes(origin)) {
      return NextResponse.next();
    }
    return forbidden();
  }

  if (site === "same-origin" || site === "none") return NextResponse.next();
  if (site) return forbidden(); // cross-site / same-site without an allowed Origin

  // Older browsers (e.g. Safari before 16.4) send neither header on same-origin
  // GETs, but do send a Referer.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin === req.nextUrl.origin) return NextResponse.next();
    } catch {
      /* malformed referer */
    }
    return forbidden();
  }

  // No browser headers at all: a script or server. Allowed only for local use.
  return isHosted ? forbidden() : NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
