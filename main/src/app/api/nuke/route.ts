import { nukeAllMantras } from '../../../lib/server/mantraCore';

export async function POST(): Promise<Response> {
  try {
    const result = await nukeAllMantras();
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, message: 'Nuke failed.', deletedCount: 0 }, { status: 500 });
  }
}
