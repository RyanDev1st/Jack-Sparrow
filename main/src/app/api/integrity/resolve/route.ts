import { repairPoolMismatches } from '../../../../lib/server/integrityCore';

export async function POST(): Promise<Response> {
  try {
    const result = await repairPoolMismatches();
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, updated: 0, message: 'Integrity repair failed.' }, { status: 500 });
  }
}
