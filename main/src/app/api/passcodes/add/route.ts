import { addPasscodeSecure } from '../../../../lib/server/passcodeCore';

type Body = { founderCode?: string; code?: string; role?: 'admin' | 'founder'; label?: string };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const result = await addPasscodeSecure({
      founderCode: String(body.founderCode ?? ''),
      code: String(body.code ?? ''),
      role: body.role === 'founder' ? 'founder' : 'admin',
      label: String(body.label ?? ''),
    });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, message: 'Passcode add failed.' }, { status: 500 });
  }
}
