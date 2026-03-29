import { lookupHunter } from '../../../lib/server/mantraCore';

type Body = { mantra_id?: string; session_id?: string };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const result = await lookupHunter(body.session_id ?? body.mantra_id ?? '');
    return Response.json(result, { status: result.ok ? 200 : 404 });
  } catch {
    return Response.json({ ok: false, message: 'Lookup failed.', hunter: null }, { status: 500 });
  }
}
