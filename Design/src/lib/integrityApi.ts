export type IntegrityReport = {
  ok: boolean;
  duplicateCodesWithinMap: Array<{ mapId: string; duplicates: string[] }>;
  duplicateCodesAcrossMaps: Array<{ code: string; mapIds: string[] }>;
  missingCodes: Array<{ mapId: string; zoneId: string }>;
  poolMismatches: Array<{ mapId: string; expectedCount: number; actualCount: number }>;
  message: string;
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  return (await response.json()) as T;
};

export async function auditIntegrityApi(): Promise<IntegrityReport> {
  return fetchJson<IntegrityReport>('/api/integrity/audit', { method: 'GET' });
}

export async function resolvePoolMismatchesApi(): Promise<{ ok: boolean; updated: number; message: string }> {
  return fetchJson<{ ok: boolean; updated: number; message: string }>('/api/integrity/resolve', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
