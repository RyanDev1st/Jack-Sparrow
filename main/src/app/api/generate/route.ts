import { generateHunter } from '../../../lib/server/mantraCore';

type Body = {
  excludedMapSetIds?: string[];
  completedMapSetIds?: string[];
  maxAttempts?: number;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const result = await generateHunter({
      excludedMapSetIds: body.excludedMapSetIds,
      completedMapSetIds: body.completedMapSetIds,
      maxAttempts: body.maxAttempts,
    });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, message: 'Failed to generate mantra.', hunter: null }, { status: 500 });
  }
}
