import { updatePasscodeSecure } from '../../../../lib/server/passcodeCore';

type Body = {
  founderCode?: string;
  id?: string;
  code?: string;
  role?: 'admin' | 'founder';
  label?: string;
  active?: boolean;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const role = body.role === 'founder' || body.role === 'admin' ? body.role : undefined;
    const result = await updatePasscodeSecure({
      founderCode: String(body.founderCode ?? ''),
      id: String(body.id ?? ''),
      code: body.code,
      role,
      label: body.label,
      active: body.active,
    });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, message: 'Passcode update failed.' }, { status: 500 });
  }
}
