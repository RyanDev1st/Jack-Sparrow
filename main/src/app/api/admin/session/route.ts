import { buildAdminSessionCookie, clearAdminSessionCookie } from '../../../../lib/server/security';

type Body = { pin?: string };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    if (String(body.pin ?? '') !== '2026') {
      return Response.json({ ok: false, message: 'Invalid admin PIN.' }, { status: 401 });
    }

    const setCookie = await buildAdminSessionCookie('admin');
    return new Response(JSON.stringify({ ok: true, message: 'Admin session established.' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setCookie,
      },
    });
  } catch {
    return Response.json({ ok: false, message: 'Failed to establish admin session.' }, { status: 500 });
  }
}

export async function DELETE(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, message: 'Admin session cleared.' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearAdminSessionCookie(),
    },
  });
}
