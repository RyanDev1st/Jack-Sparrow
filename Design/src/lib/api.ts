import type { Hunter, HunterStatus } from './db';
import type {
  ActiveHunterSummary,
  ClaimAuditResult,
  GenerateMantraOptions,
  HunterLookupResult,
  ValidateNodeRequest,
  ValidateNodeResult,
} from './apiTypes';

export type {
  ActiveHunterSummary,
  ClaimAuditResult,
  GenerateMantraOptions,
  HunterLookupResult,
  ValidateNodeRequest,
  ValidateNodeResult,
} from './apiTypes';

type PublicHunter = {
  session_id: string;
  mantra_id: string;
  mantra_code: string;
  status: HunterStatus;
  assigned_count: number;
  scanned_count: number;
  map_set_id?: string;
  assigned_clue_ids?: string[];
};

type PublicHunterResult = {
  ok: boolean;
  message: string;
  hunter: PublicHunter | null;
};

const toMaskedHunter = (hunter: PublicHunter | null): Hunter | null => {
  if (!hunter) return null;
  return {
    session_id: hunter.session_id,
    mantra_id: hunter.mantra_id,
    mantra_code: hunter.mantra_code,
    status: hunter.status,
    map_set_id: hunter.map_set_id,
    assigned_map: Array.from({ length: hunter.assigned_count }, () => '*'),
    assigned_clue_ids: Array.isArray(hunter.assigned_clue_ids) ? hunter.assigned_clue_ids : [],
    scanned_nodes: Array.from({ length: hunter.scanned_count }, () => '*'),
  };
};

const fetchJson = async <T>(url: string, init?: RequestInit, timeoutMs = 12000): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...init,
    });

    const data = (await response.json()) as T;
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
};

export async function generateMantraApi(request: GenerateMantraOptions): Promise<HunterLookupResult> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await fetchJson<PublicHunterResult>('/api/generate', {
        method: 'POST',
        body: JSON.stringify(request),
      }, 15000);

      return {
        ok: result.ok,
        message: result.message,
        session_id: result.hunter?.session_id ?? '',
        mantra_id: result.hunter?.mantra_id ?? '',
        mantra_code: result.hunter?.mantra_code ?? '',
        mapSetId: result.hunter?.map_set_id,
        assignedClueIds: Array.isArray(result.hunter?.assigned_clue_ids) ? result.hunter.assigned_clue_ids : [],
        hunter: toMaskedHunter(result.hunter),
      };
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
  }

  throw lastError ?? new Error('Generate mantra failed.');
}

export async function lookupHunterApi(mantra_id: string): Promise<HunterLookupResult> {
  const result = await fetchJson<PublicHunterResult>('/api/lookup', {
    method: 'POST',
    body: JSON.stringify({ mantra_id }),
  });

  return {
    ok: result.ok,
    message: result.message,
    session_id: result.hunter?.session_id ?? '',
    mantra_id: result.hunter?.mantra_id ?? mantra_id,
    mantra_code: result.hunter?.mantra_code ?? '',
    mapSetId: result.hunter?.map_set_id,
    assignedClueIds: Array.isArray(result.hunter?.assigned_clue_ids) ? result.hunter.assigned_clue_ids : [],
    hunter: toMaskedHunter(result.hunter),
  };
}

export async function validateNodeApi(request: ValidateNodeRequest): Promise<ValidateNodeResult> {
  const result = await fetchJson<{
    ok: boolean;
    message: string;
    session_id: string;
    mantra_id: string;
    mantra_code: string;
    status: HunterStatus;
    scanned_count: number;
    assigned_count: number;
    scanned_nodes?: string[];
    map_set_id?: string;
    assigned_clue_ids?: string[];
  }>('/api/validate', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  const maskedHunter = toMaskedHunter({
    session_id: result.session_id,
    mantra_id: result.mantra_id,
    mantra_code: result.mantra_code,
    status: result.status,
    assigned_count: result.assigned_count,
    scanned_count: result.scanned_count,
    map_set_id: result.map_set_id,
    assigned_clue_ids: Array.isArray(result.assigned_clue_ids) ? result.assigned_clue_ids : [],
  });

  return {
    ok: result.ok,
    message: result.message,
    session_id: result.session_id,
    mantra_id: result.mantra_id,
    mantra_code: result.mantra_code,
    status: result.status,
    scanned_count: result.scanned_count,
    assigned_count: result.assigned_count,
    scanned_nodes: Array.isArray(result.scanned_nodes) ? result.scanned_nodes.map(String) : [],
    hunter: maskedHunter,
    assigned_clue_ids: Array.isArray(result.assigned_clue_ids) ? result.assigned_clue_ids : [],
  };
}

export async function finalizeClaimApi(mantra_id: string): Promise<HunterLookupResult> {
  const result = await fetchJson<PublicHunterResult>('/api/finalize', {
    method: 'POST',
    body: JSON.stringify({ mantra_id }),
  });

  return {
    ok: result.ok,
    message: result.message,
    session_id: result.hunter?.session_id ?? '',
    mantra_id: result.hunter?.mantra_id ?? mantra_id,
    mantra_code: result.hunter?.mantra_code ?? '',
    mapSetId: result.hunter?.map_set_id,
    assignedClueIds: Array.isArray(result.hunter?.assigned_clue_ids) ? result.hunter.assigned_clue_ids : [],
    hunter: toMaskedHunter(result.hunter),
  };
}

export async function deleteMantraApi(mantra_id: string): Promise<{ ok: boolean; message: string }> {
  return fetchJson<{ ok: boolean; message: string }>('/api/delete-mantra', {
    method: 'POST',
    body: JSON.stringify({ mantra_id }),
  });
}

export async function deleteSessionApi(session_id: string): Promise<{ ok: boolean; message: string }> {
  return fetchJson<{ ok: boolean; message: string }>('/api/delete-mantra', {
    method: 'POST',
    body: JSON.stringify({ session_id }),
  });
}

export async function nukeAllMantrasApi(): Promise<{ ok: boolean; message: string; deletedCount: number }> {
  return fetchJson<{ ok: boolean; message: string; deletedCount: number }>('/api/nuke', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function listActiveMantrasApi(): Promise<ActiveHunterSummary[]> {
  const result = await fetchJson<unknown>('/api/active-mantras', { method: 'GET' });
  return Array.isArray(result) ? (result as ActiveHunterSummary[]) : [];
}

export async function getClaimAuditApi(identifier: string): Promise<ClaimAuditResult> {
  const result = await fetchJson<ClaimAuditResult>('/api/claim/audit', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });

  return {
    ok: Boolean(result.ok),
    message: String(result.message ?? ''),
    sessionId: String(result.sessionId ?? ''),
    mantraId: String(result.mantraId ?? ''),
    totalUserClaims: Number(result.totalUserClaims ?? 0),
    repeatHistory: Array.isArray(result.repeatHistory) ? result.repeatHistory : [],
  };
}
