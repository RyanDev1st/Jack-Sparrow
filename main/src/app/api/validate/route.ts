import { validateNode } from '../../../lib/server/mantraCore';

type Body = {
  session_id?: string;
  mantra_id?: string;
  scanned_payload?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const result = await validateNode({
      session_id: body.session_id,
      mantra_id: body.mantra_id ?? '',
      scanned_payload: body.scanned_payload ?? '',
    });
    return Response.json(result, { status: 200 });
  } catch {
    return Response.json(
      {
        ok: false,
        message: 'Validation failed.',
        session_id: '',
        mantra_id: '',
        status: 'HUNTING',
        scanned_count: 0,
        assigned_count: 0,
      },
      { status: 500 },
    );
  }
}
