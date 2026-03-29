import { loadEnv, type Plugin } from 'vite';
import {
  buildAdminSessionCookie,
  claimGateRedirectPath,
  clearAdminSessionCookie,
  consumeRateLimit,
  hasValidAdminSession,
} from './src/lib/server/security';

type MantraCore = typeof import('./src/lib/server/mantraCore');
type PasscodeCore = typeof import('./src/lib/server/passcodeCore');
type IntegrityCore = typeof import('./src/lib/server/integrityCore');
type ClaimCore = typeof import('./src/lib/server/claimCore');

const parseJsonBody = async (req: any): Promise<Record<string, unknown>> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
  }

  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  return JSON.parse(text) as Record<string, unknown>;
};

const sendJson = (res: any, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const sendEmpty = (res: any, status: number, extraHeaders?: Record<string, string>) => {
  res.statusCode = status;
  if (extraHeaders) {
    Object.entries(extraHeaders).forEach(([key, value]) => res.setHeader(key, value));
  }
  res.end();
};

export function devApiMiddleware(): Plugin {
  let corePromise: Promise<MantraCore> | null = null;
  let passcodePromise: Promise<PasscodeCore> | null = null;
  let integrityPromise: Promise<IntegrityCore> | null = null;
  let claimPromise: Promise<ClaimCore> | null = null;
  const getCore = (): Promise<MantraCore> => {
    if (!corePromise) corePromise = import('./src/lib/server/mantraCore');
    return corePromise;
  };
  const getPasscodes = (): Promise<PasscodeCore> => {
    if (!passcodePromise) passcodePromise = import('./src/lib/server/passcodeCore');
    return passcodePromise;
  };
  const getIntegrity = (): Promise<IntegrityCore> => {
    if (!integrityPromise) integrityPromise = import('./src/lib/server/integrityCore');
    return integrityPromise;
  };
  const getClaims = (): Promise<ClaimCore> => {
    if (!claimPromise) claimPromise = import('./src/lib/server/claimCore');
    return claimPromise;
  };

  return {
    name: 'dev-api-middleware',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      Object.entries(env).forEach(([key, value]) => {
        if (key.startsWith('VITE_') && !process.env[key]) {
          process.env[key] = value;
        }
      });

      server.middlewares.use('/api', async (req: any, res: any, next: () => void) => {
        try {
          const method = String(req.method || 'GET').toUpperCase();
          const path = String(req.url || '').split('?')[0];

          if ((method === 'POST' && path === '/passcodes/verify') || (method === 'POST' && path === '/admin/session')) {
            const ipHeader = Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : String(req.headers['x-forwarded-for'] ?? '');
            const ip = ipHeader.split(',')[0]?.trim() || String(req.socket?.remoteAddress ?? 'unknown');
            const limited = consumeRateLimit(ip, `/api${path}`);
            if (!limited.allowed) {
              return sendEmpty(res, 429, {
                'Retry-After': String(limited.retryAfterSeconds),
                Connection: 'close',
              });
            }
          }

          if (method === 'POST' && path === '/generate') {
            const core = await getCore();
            const body = await parseJsonBody(req);
            const result = await core.generateHunter({
              excludedMapSetIds: Array.isArray(body.excludedMapSetIds) ? (body.excludedMapSetIds as string[]) : [],
              completedMapSetIds: Array.isArray(body.completedMapSetIds) ? (body.completedMapSetIds as string[]) : [],
              maxAttempts: Number(body.maxAttempts ?? 40),
            });
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/validate') {
            const core = await getCore();
            const body = await parseJsonBody(req);
            const result = await core.validateNode({
              session_id: String(body.session_id ?? ''),
              mantra_id: String(body.mantra_id ?? ''),
              scanned_payload: String(body.scanned_payload ?? ''),
            });
            return sendJson(res, 200, result);
          }

          if (method === 'POST' && path === '/lookup') {
            const core = await getCore();
            const body = await parseJsonBody(req);
            const result = await core.lookupHunter(String(body.session_id ?? body.mantra_id ?? ''));
            return sendJson(res, result.ok ? 200 : 404, result);
          }

          if (method === 'POST' && path === '/finalize') {
            const core = await getCore();
            const body = await parseJsonBody(req);
            const result = await core.finalizeClaim(String(body.session_id ?? body.mantra_id ?? ''));
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/delete-mantra') {
            const core = await getCore();
            const body = await parseJsonBody(req);
            const result = await core.deleteMantra(String(body.session_id ?? body.mantra_id ?? ''));
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/nuke') {
            const core = await getCore();
            const result = await core.nukeAllMantras();
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'GET' && path === '/active-mantras') {
            const core = await getCore();
            const items = await core.listActiveMantras();
            return sendJson(res, 200, items);
          }

          if (method === 'GET' && path === '/passcodes/list') {
            const passcodes = await getPasscodes();
            const items = await passcodes.listPasscodesSecure();
            return sendJson(res, 200, { ok: true, items, message: 'Passcodes loaded.' });
          }

          if (method === 'POST' && path === '/passcodes/verify') {
            const passcodes = await getPasscodes();
            const body = await parseJsonBody(req);
            const result = await passcodes.verifyPasscode(String(body.code ?? ''));
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/passcodes/add') {
            const passcodes = await getPasscodes();
            const body = await parseJsonBody(req);
            const result = await passcodes.addPasscodeSecure({
              founderCode: String(body.founderCode ?? ''),
              code: String(body.code ?? ''),
              role: body.role === 'founder' ? 'founder' : 'admin',
              label: String(body.label ?? ''),
            });
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/passcodes/update') {
            const passcodes = await getPasscodes();
            const body = await parseJsonBody(req);
            const role = body.role === 'founder' || body.role === 'admin' ? body.role : undefined;
            const result = await passcodes.updatePasscodeSecure({
              founderCode: String(body.founderCode ?? ''),
              id: String(body.id ?? ''),
              code: typeof body.code === 'string' ? body.code : undefined,
              role,
              label: typeof body.label === 'string' ? body.label : undefined,
              active: typeof body.active === 'boolean' ? body.active : undefined,
            });
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/passcodes/delete') {
            const passcodes = await getPasscodes();
            const body = await parseJsonBody(req);
            const result = await passcodes.deletePasscodeSecure({
              founderCode: String(body.founderCode ?? ''),
              id: String(body.id ?? ''),
            });
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'GET' && path === '/integrity/audit') {
            const integrity = await getIntegrity();
            const report = await integrity.runIntegrityAudit();
            return sendJson(res, 200, report);
          }

          if (method === 'POST' && path === '/integrity/resolve') {
            const integrity = await getIntegrity();
            const result = await integrity.repairPoolMismatches();
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/claims/scan') {
            const claims = await getClaims();
            const body = await parseJsonBody(req);
            const forwarded = req.headers['x-forwarded-for'];
            const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : String(forwarded ?? '');
            const remoteIp = String(req.socket?.remoteAddress ?? '');
            const ipAddress = forwardedIp.split(',')[0]?.trim() || remoteIp;
            const result = await claims.scanClaimCandidate({
              identifier: String(body.session_id ?? body.identifier ?? ''),
              deviceFingerprint: String(body.device_fingerprint ?? ''),
              browserId: String(body.browser_id ?? ''),
              ipAddress,
            });
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/claim/scan') {
            const claims = await getClaims();
            const body = await parseJsonBody(req);
            const forwarded = req.headers['x-forwarded-for'];
            const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : String(forwarded ?? '');
            const remoteIp = String(req.socket?.remoteAddress ?? '');
            const ipAddress = forwardedIp.split(',')[0]?.trim() || remoteIp;
            const result = await claims.scanClaimCandidate({
              identifier: String(body.session_id ?? body.identifier ?? ''),
              deviceFingerprint: String(body.device_fingerprint ?? ''),
              browserId: String(body.browser_id ?? ''),
              ipAddress,
            });
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/claims/audit') {
            const claims = await getClaims();
            const body = await parseJsonBody(req);
            const result = await claims.getClaimAuditByIdentifier(String(body.identifier ?? body.session_id ?? body.mantra_id ?? ''));
            return sendJson(res, result.ok ? 200 : 404, result);
          }

          if (method === 'POST' && path === '/claim/audit') {
            const claims = await getClaims();
            const body = await parseJsonBody(req);
            const result = await claims.getClaimAuditByIdentifier(String(body.identifier ?? body.session_id ?? body.mantra_id ?? ''));
            return sendJson(res, result.ok ? 200 : 404, result);
          }

          if (method === 'POST' && path === '/claims/finalize') {
            const claims = await getClaims();
            const body = await parseJsonBody(req);
            const result = await claims.finalizeClaimFromSession(String(body.session_id ?? ''));
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'POST' && path === '/claim/finalize') {
            const claims = await getClaims();
            const body = await parseJsonBody(req);
            const result = await claims.finalizeClaimFromSession(String(body.session_id ?? ''));
            return sendJson(res, result.ok ? 200 : 400, result);
          }

          if (method === 'GET' && path === '/claim/gate') {
            const cookieHeader = String(req.headers.cookie ?? '');
            const valid = await hasValidAdminSession(cookieHeader);
            if (!valid) return sendEmpty(res, 403);

            const url = new URL(String(req.url ?? ''), 'http://localhost');
            const sid = String(url.searchParams.get('sid') ?? '');
            res.statusCode = 302;
            res.setHeader('Location', claimGateRedirectPath(sid));
            return res.end();
          }

          if (method === 'POST' && path === '/admin/session') {
            const body = await parseJsonBody(req);
            const pin = String(body.pin ?? '');
            if (pin !== '2026') return sendJson(res, 401, { ok: false, message: 'Invalid admin PIN.' });

            const cookie = await buildAdminSessionCookie('admin');
            res.setHeader('Set-Cookie', cookie);
            return sendJson(res, 200, { ok: true, message: 'Admin session established.' });
          }

          if (method === 'DELETE' && path === '/admin/session') {
            res.setHeader('Set-Cookie', clearAdminSessionCookie());
            return sendJson(res, 200, { ok: true, message: 'Admin session cleared.' });
          }

          return next();
        } catch (error) {
          return sendJson(res, 500, {
            ok: false,
            message: error instanceof Error ? error.message : 'Internal API middleware error.',
          });
        }
      });
    },
  };
}
