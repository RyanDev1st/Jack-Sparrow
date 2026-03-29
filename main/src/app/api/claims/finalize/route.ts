import { finalizeClaimFromSession } from '../../../../lib/server/claimCore';

type Body = { session_id?: string };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const result = await finalizeClaimFromSession(String(body.session_id ?? ''));
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, message: 'Claim finalize failed.' }, { status: 500 });
  }
}
