import { deletePasscodeSecure } from '../../../../lib/server/passcodeCore';

type Body = { founderCode?: string; id?: string };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const result = await deletePasscodeSecure({
      founderCode: String(body.founderCode ?? ''),
      id: String(body.id ?? ''),
    });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, message: 'Passcode delete failed.' }, { status: 500 });
  }
}
