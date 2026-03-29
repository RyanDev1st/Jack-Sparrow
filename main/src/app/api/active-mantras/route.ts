import { listActiveMantras } from '../../../lib/server/mantraCore';

export async function GET(): Promise<Response> {
  try {
    const items = await listActiveMantras();
    return Response.json(items, { status: 200 });
  } catch {
    return Response.json([], { status: 500 });
  }
}
