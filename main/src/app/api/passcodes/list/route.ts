import { listPasscodesSecure } from '../../../../lib/server/passcodeCore';

export async function GET(): Promise<Response> {
  try {
    const items = await listPasscodesSecure();
    return Response.json({ ok: true, items, message: 'Passcodes loaded.' }, { status: 200 });
  } catch {
    return Response.json({ ok: false, items: [], message: 'Failed to load passcodes.' }, { status: 500 });
  }
}
