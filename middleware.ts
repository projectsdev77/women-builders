import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin } from '@/lib/security/origin';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * 1. Exact-origin CSRF check for mutating API calls (G4). Cron routes use a bearer secret instead.
 * 2. Nonce-based Content-Security-Policy (G18).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/api/') &&
    MUTATING.has(req.method) &&
    !pathname.startsWith('/api/cron/') &&
    !pathname.startsWith('/api/notifications/unsubscribe')
  ) {
    const appUrl = process.env.APP_URL ?? req.nextUrl.origin;
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'), appUrl)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cross-origin request blocked.' } },
        { status: 403 },
      );
    }
  }

  if (pathname.startsWith('/api/')) return NextResponse.next();

  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
};
