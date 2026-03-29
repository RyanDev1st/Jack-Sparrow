import { scanClaimCandidate } from '../../../../lib/server/claimCore';

type Body = { session_id?: string; identifier?: string; device_fingerprint?: string; browser_id?: string };

const getIp = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? '';
  return request.headers.get('x-real-ip') ?? '';
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const result = await scanClaimCandidate({
      identifier: String(body.session_id ?? body.identifier ?? ''),
      deviceFingerprint: String(body.device_fingerprint ?? ''),
      browserId: String(body.browser_id ?? ''),
      ipAddress: getIp(request),
    });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, message: 'Claim scan failed.', status: 'needs-review', statusLabel: 'Needs Review' }, { status: 500 });
  }
}
