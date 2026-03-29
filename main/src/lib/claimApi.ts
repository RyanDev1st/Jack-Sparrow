export type ClaimScanResult = {
  ok: boolean;
  message: string;
  status: 'first-time' | 'repeat' | 'claimed' | 'needs-review';
  statusLabel: string;
  mantraId: string;
  mantraCode: string;
  sessionId: string;
  hunterStatus: 'HUNTING' | 'FINISHED' | 'CLAIMED' | 'UNKNOWN';
  totalUserClaims?: number;
  repeatHistory?: Array<{
    sessionId: string;
    mantraId: string;
    hunterStatus: 'HUNTING' | 'FINISHED' | 'CLAIMED' | 'UNKNOWN';
    updatedAt: number;
    deviceFingerprint?: string;
    browserId?: string;
  }>;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const fetchJson = async <T>(url: string, init?: RequestInit, timeoutMs = 10000): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...init,
    });
    const raw = await response.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const message =
        typeof parsed === 'object' && parsed !== null && 'message' in parsed
          ? String((parsed as { message?: unknown }).message ?? `HTTP ${response.status}`)
          : raw || `HTTP ${response.status}`;
      throw new Error(message);
    }

    if (parsed === null || typeof parsed !== 'object') {
      throw new Error('Unexpected empty or non-JSON response from claim API.');
    }

    return parsed as T;
  } finally {
    window.clearTimeout(timeout);
  }
};

const withRetry = async <T>(factory: () => Promise<T>, retries = 1): Promise<T> => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(250 + attempt * 250);
    }
  }
  throw lastError ?? new Error('Claim API request failed.');
};

export async function scanClaimApi(identifier: string, device_fingerprint: string, browser_id = ''): Promise<ClaimScanResult> {
  return withRetry(
    () =>
      fetchJson<ClaimScanResult>(
        '/api/claim/scan',
        {
          method: 'POST',
          body: JSON.stringify({ session_id: identifier, identifier, device_fingerprint, browser_id }),
        },
        12000,
      ),
    1,
  );
}

export async function finalizeClaimBySessionApi(session_id: string): Promise<{ ok: boolean; message: string }> {
  return withRetry(
    () =>
      fetchJson<{ ok: boolean; message: string }>(
        '/api/claim/finalize',
        {
          method: 'POST',
          body: JSON.stringify({ session_id }),
        },
        12000,
      ),
    1,
  );
}
