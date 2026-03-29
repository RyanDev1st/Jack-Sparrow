type RateLimitState = {
  count: number;
  resetAt: number;
};

const ADMIN_COOKIE = 'admin_session';
const ADMIN_SESSION_MS = 5 * 60 * 60 * 1000;
const RATE_LIMIT_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const DEV_SECRET = 'local-dev-admin-secret';

const now = () => Date.now();
const secret = () => (typeof process !== 'undefined' ? process.env.ADMIN_SESSION_SECRET : undefined) || DEV_SECRET;

const ensureMap = () => {
  const g = globalThis as { __securityRateLimitMap?: Map<string, RateLimitState> };
  if (!g.__securityRateLimitMap) g.__securityRateLimitMap = new Map<string, RateLimitState>();
  return g.__securityRateLimitMap;
};

const toHex = (bytes: Uint8Array): string => Array.from(bytes).map((v) => v.toString(16).padStart(2, '0')).join('');

const sign = async (value: string): Promise<string> => {
  const keyBytes = new TextEncoder().encode(secret());
  const dataBytes = new TextEncoder().encode(value);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, dataBytes);
  return toHex(new Uint8Array(sig));
};

const parseCookies = (cookieHeader: string): Record<string, string> => {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((out, pair) => {
      const idx = pair.indexOf('=');
      if (idx < 1) return out;
      out[pair.slice(0, idx)] = pair.slice(idx + 1);
      return out;
    }, {});
};

const parseSessionToken = (token: string): { exp: number; role: string } | null => {
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const encoded = token.slice(0, idx);
  const payloadText = decodeURIComponent(encoded);
  try {
    const payload = JSON.parse(payloadText) as { exp?: number; role?: string };
    if (typeof payload.exp !== 'number' || typeof payload.role !== 'string') return null;
    return { exp: payload.exp, role: payload.role };
  } catch {
    return null;
  }
};

export const getClientIp = (headers: Headers): string => {
  const forwarded = headers.get('x-forwarded-for') ?? '';
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  const realIp = headers.get('x-real-ip') ?? '';
  return realIp || 'unknown';
};

export const isRateLimitedPath = (pathname: string): boolean =>
  pathname === '/api/passcodes/verify' || pathname === '/api/admin/session';

export const consumeRateLimit = (ip: string, pathname: string): { allowed: boolean; retryAfterSeconds: number } => {
  const map = ensureMap();
  const key = `${ip}:${pathname.includes('/passcodes/verify') ? 'passcode-login' : 'admin-login'}`;
  const stamp = now();
  const current = map.get(key);

  if (!current || stamp >= current.resetAt) {
    map.set(key, { count: 1, resetAt: stamp + RATE_LIMIT_MS });
    return { allowed: true, retryAfterSeconds: Math.ceil(RATE_LIMIT_MS / 1000) };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - stamp) / 1000)) };
  }

  current.count += 1;
  map.set(key, current);
  return { allowed: true, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - stamp) / 1000)) };
};

export const buildAdminSessionCookie = async (role: 'admin' = 'admin'): Promise<string> => {
  const payload = { exp: now() + ADMIN_SESSION_MS, role };
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const signature = await sign(encoded);
  const token = `${encoded}.${signature}`;
  return `${ADMIN_COOKIE}=${token}; Path=/; Max-Age=${Math.floor(ADMIN_SESSION_MS / 1000)}; HttpOnly; Secure; SameSite=Strict`;
};

export const clearAdminSessionCookie = (): string => `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

export const hasValidAdminSession = async (cookieHeader: string): Promise<boolean> => {
  if (!cookieHeader) return false;
  const token = parseCookies(cookieHeader)[ADMIN_COOKIE];
  if (!token) return false;

  const idx = token.lastIndexOf('.');
  if (idx <= 0) return false;
  const encoded = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  const expected = await sign(encoded);
  if (signature !== expected) return false;

  const payload = parseSessionToken(token);
  if (!payload) return false;
  if (payload.role !== 'admin') return false;
  return payload.exp > now();
};

export const claimGateRedirectPath = (sidRaw: string): string => {
  const sid = sidRaw.trim();
  return sid ? `/admin/claim/${encodeURIComponent(sid)}` : '/admin';
};
