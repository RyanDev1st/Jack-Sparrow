import { finalizeClaim } from '../../../lib/server/mantraCore';

type Body = { mantra_id?: string; session_id?: string };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const result = await finalizeClaim(body.session_id ?? body.mantra_id ?? '');
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, message: 'Finalize failed.', hunter: null }, { status: 500 });
  }
}
