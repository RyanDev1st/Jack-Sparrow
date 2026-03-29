import { verifyPasscode } from '../../../../lib/server/passcodeCore';

type Body = { code?: string };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const result = await verifyPasscode(String(body.code ?? ''));
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, role: null, message: 'Passcode verify failed.' }, { status: 500 });
  }
}
