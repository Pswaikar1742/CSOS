import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { CSOSRole } from '@/lib/types';
import { ROLE_ROUTES, ROLE_HOME } from '@/lib/types';

// ─── CSOS v2.0 Zero-Trust Middleware ───
// Intercepts all protected department routes.
// Reads `csos_role` cookie and enforces RBAC.
// `god-view` role bypasses all restrictions.

const PROTECTED_PREFIXES = ['/police', '/rto', '/sanitation', '/god-view'];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isValidRole(role: string): role is CSOSRole {
  return ['police', 'rto', 'sanitation', 'god-view'].includes(role);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept protected routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // ── Read the role cookie ──
  const roleCookie = request.cookies.get('csos_role')?.value;

  // No cookie → unauthorized
  if (!roleCookie || !isValidRole(roleCookie)) {
    const url = request.nextUrl.clone();
    url.pathname = '/unauthorized';
    return NextResponse.redirect(url);
  }

  const role: CSOSRole = roleCookie;

  // ── god-view sees everything ──
  if (role === 'god-view') {
    return NextResponse.next();
  }

  // ── Check route access ──
  const allowedRoutes = ROLE_ROUTES[role];
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!hasAccess) {
    // Redirect to user's home department
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/police/:path*', '/rto/:path*', '/sanitation/:path*', '/god-view/:path*'],
};
