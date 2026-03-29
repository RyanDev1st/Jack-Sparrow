import { runIntegrityAudit } from '../../../../lib/server/integrityCore';

export async function GET(): Promise<Response> {
  try {
    const report = await runIntegrityAudit();
    return Response.json(report, { status: 200 });
  } catch {
    return Response.json({ ok: false, message: 'Integrity audit failed.' }, { status: 500 });
  }
}
