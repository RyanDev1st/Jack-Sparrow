import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { consumeRateLimit, getClientIp, isRateLimitedPath } from './src/lib/server/security';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isRateLimitedPath(pathname)) return NextResponse.next();

  const ip = getClientIp(request.headers);
  const result = consumeRateLimit(ip, pathname);
  if (result.allowed) return NextResponse.next();

  return new NextResponse(null, {
    status: 429,
    headers: {
      'Retry-After': String(result.retryAfterSeconds),
      Connection: 'close',
    },
  });
}

export const config = {
  matcher: ['/api/passcodes/verify', '/api/admin/session'],
};
