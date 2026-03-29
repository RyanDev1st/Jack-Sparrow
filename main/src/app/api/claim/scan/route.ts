import { scanClaimCandidate } from '../../../../lib/server/claimCore';
import { getClientIp } from '../../../../lib/server/security';

type Body = { session_id?: string; identifier?: string; device_fingerprint?: string; browser_id?: string };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const identifier = String(body.session_id ?? body.identifier ?? '');
    const result = await scanClaimCandidate({
      identifier,
      deviceFingerprint: String(body.device_fingerprint ?? ''),
      browserId: String(body.browser_id ?? ''),
      ipAddress: getClientIp(request.headers),
    });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('[claim/scan] Error:', errorMessage, error);
    return Response.json({ ok: false, message: `Claim scan failed: ${errorMessage}`, status: 'needs-review', statusLabel: 'Needs Review' }, { status: 500 });
  }
}
