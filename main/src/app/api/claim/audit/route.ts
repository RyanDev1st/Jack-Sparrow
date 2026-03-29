import { getClaimAuditByIdentifier } from '../../../../lib/server/claimCore';

type Body = { session_id?: string; mantra_id?: string; identifier?: string };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const identifier = String(body.identifier ?? body.session_id ?? body.mantra_id ?? '');
    const result = await getClaimAuditByIdentifier(identifier);
    return Response.json(result, { status: result.ok ? 200 : 404 });
  } catch {
    return Response.json({ ok: false, message: 'Claim audit lookup failed.', sessionId: '', mantraId: '', totalUserClaims: 0, repeatHistory: [] }, { status: 500 });
  }
}
