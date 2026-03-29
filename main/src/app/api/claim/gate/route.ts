import { claimGateRedirectPath, hasValidAdminSession } from '../../../../lib/server/security';

export async function GET(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const valid = await hasValidAdminSession(cookieHeader);
  if (!valid) {
    return new Response(null, { status: 403 });
  }

  const url = new URL(request.url);
  const sid = url.searchParams.get('sid') ?? '';
  const location = claimGateRedirectPath(sid);
  return Response.redirect(new URL(location, url.origin), 302);
}
