import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { finalizeClaim, findHunterByIdentifier } from './mantraCore';

const claimsCollection = 'claims';

export type ClaimJudgmentStatus = 'first-time' | 'repeat' | 'claimed' | 'needs-review';

export type ClaimAuditEntry = {
  sessionId: string;
  mantraId: string;
  hunterStatus: 'HUNTING' | 'FINISHED' | 'CLAIMED' | 'UNKNOWN';
  updatedAt: number;
  deviceFingerprint?: string;
  browserId?: string;
};

const normalize = (value: string) => value.trim();

const statusLabel = (status: ClaimJudgmentStatus): string => {
  if (status === 'first-time') return 'First-time Participant';
  if (status === 'repeat') return 'Repeat Participant';
  if (status === 'claimed') return 'Claimed';
  return 'Needs Review';
};

const deriveStatus = (params: { alreadyClaimed: boolean; sameFingerprintCount: number; sameIpCount: number; fingerprint: string; ip: string }): ClaimJudgmentStatus => {
  if (params.alreadyClaimed) return 'claimed';
  if (!params.fingerprint || !params.ip) return 'needs-review';
  if (params.sameFingerprintCount > 0 || params.sameIpCount > 0) return 'repeat';
  return 'first-time';
};

const buildAuditFromDocs = (docs: Array<{ id: string; data: Record<string, unknown> }>): ClaimAuditEntry[] => {
  const map = new Map<string, ClaimAuditEntry>();
  docs.forEach((entry) => {
    map.set(entry.id, {
      sessionId: String(entry.data.sessionId ?? entry.id),
      mantraId: String(entry.data.mantraId ?? ''),
      hunterStatus: String(entry.data.hunterStatus ?? 'UNKNOWN') as ClaimAuditEntry['hunterStatus'],
      updatedAt: Number(entry.data.updatedAt ?? 0),
      deviceFingerprint: typeof entry.data.deviceFingerprint === 'string' ? entry.data.deviceFingerprint : undefined,
      browserId: typeof entry.data.browserId === 'string' ? entry.data.browserId : undefined,
    });
  });
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
};

export async function getClaimAuditByIdentifier(identifierRaw: string): Promise<{
  ok: boolean;
  message: string;
  sessionId: string;
  mantraId: string;
  totalUserClaims: number;
  repeatHistory: ClaimAuditEntry[];
}> {
  const identifier = normalize(identifierRaw);
  if (!identifier) {
    return { ok: false, message: 'Missing identifier.', sessionId: '', mantraId: '', totalUserClaims: 0, repeatHistory: [] };
  }

  const found = await findHunterByIdentifier(identifier);
  if (!found.hunter) {
    return { ok: false, message: 'Session/mantra not found.', sessionId: '', mantraId: '', totalUserClaims: 0, repeatHistory: [] };
  }

  const sessionId = found.hunter.session_id;
  const mantraId = found.hunter.mantra_id;
  const claimSnap = await getDoc(doc(db, claimsCollection, sessionId));
  if (!claimSnap.exists()) {
    return { ok: true, message: 'No claim history recorded for this session yet.', sessionId, mantraId, totalUserClaims: 0, repeatHistory: [] };
  }

  const claimData = claimSnap.data() as Record<string, unknown>;
  const deviceFingerprint = normalize(String(claimData.deviceFingerprint ?? ''));
  const browserId = normalize(String(claimData.browserId ?? ''));

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];
  if (deviceFingerprint) {
    const byFingerprint = await getDocs(query(collection(db, claimsCollection), where('deviceFingerprint', '==', deviceFingerprint)));
    byFingerprint.docs.forEach((entry) => docs.push({ id: entry.id, data: entry.data() as Record<string, unknown> }));
  }
  if (browserId) {
    const byBrowser = await getDocs(query(collection(db, claimsCollection), where('browserId', '==', browserId)));
    byBrowser.docs.forEach((entry) => docs.push({ id: entry.id, data: entry.data() as Record<string, unknown> }));
  }

  const repeatHistory = buildAuditFromDocs(docs);
  return {
    ok: true,
    message: 'Claim audit loaded.',
    sessionId,
    mantraId,
    totalUserClaims: repeatHistory.length,
    repeatHistory: repeatHistory.slice(0, 12),
  };
}

export async function scanClaimCandidate(input: {
  identifier: string;
  deviceFingerprint: string;
  browserId?: string;
  ipAddress: string;
}): Promise<{
  ok: boolean;
  message: string;
  status: ClaimJudgmentStatus;
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
}> {
  const identifier = normalize(input.identifier);
  const fingerprint = normalize(input.deviceFingerprint);
  const browserId = normalize(String(input.browserId ?? ''));
  const ip = normalize(input.ipAddress);

  if (!identifier) {
    return { ok: false, message: 'Missing session/mantra identifier.', status: 'needs-review', statusLabel: statusLabel('needs-review'), mantraId: '', mantraCode: '', sessionId: '', hunterStatus: 'UNKNOWN' };
  }

  const hunter = await findHunterByIdentifier(identifier);
  if (!hunter.hunter) {
    return { ok: false, message: 'Session/mantra not found.', status: 'needs-review', statusLabel: statusLabel('needs-review'), mantraId: '', mantraCode: '', sessionId: '', hunterStatus: 'UNKNOWN' };
  }

  const sessionId = hunter.hunter.session_id;

  const byFingerprint = fingerprint
    ? await getDocs(query(collection(db, claimsCollection), where('deviceFingerprint', '==', fingerprint)))
    : await getDocs(query(collection(db, claimsCollection), where('deviceFingerprint', '==', '__none__')));
  const byIp = ip
    ? await getDocs(query(collection(db, claimsCollection), where('ipAddress', '==', ip)))
    : await getDocs(query(collection(db, claimsCollection), where('ipAddress', '==', '__none__')));
  const byBrowser = browserId
    ? await getDocs(query(collection(db, claimsCollection), where('browserId', '==', browserId)))
    : await getDocs(query(collection(db, claimsCollection), where('browserId', '==', '__none__')));

  const historyBySession = new Map<string, {
    sessionId: string;
    mantraId: string;
    hunterStatus: 'HUNTING' | 'FINISHED' | 'CLAIMED' | 'UNKNOWN';
    updatedAt: number;
    deviceFingerprint?: string;
    browserId?: string;
  }>();

  byFingerprint.docs.forEach((entry) => {
    const data = entry.data() as Record<string, unknown>;
    historyBySession.set(entry.id, {
      sessionId: String(data.sessionId ?? entry.id),
      mantraId: String(data.mantraId ?? ''),
      hunterStatus: (String(data.hunterStatus ?? 'UNKNOWN') as 'HUNTING' | 'FINISHED' | 'CLAIMED' | 'UNKNOWN'),
      updatedAt: Number(data.updatedAt ?? 0),
      deviceFingerprint: typeof data.deviceFingerprint === 'string' ? data.deviceFingerprint : undefined,
      browserId: typeof data.browserId === 'string' ? data.browserId : undefined,
    });
  });

  byBrowser.docs.forEach((entry) => {
    const data = entry.data() as Record<string, unknown>;
    historyBySession.set(entry.id, {
      sessionId: String(data.sessionId ?? entry.id),
      mantraId: String(data.mantraId ?? ''),
      hunterStatus: (String(data.hunterStatus ?? 'UNKNOWN') as 'HUNTING' | 'FINISHED' | 'CLAIMED' | 'UNKNOWN'),
      updatedAt: Number(data.updatedAt ?? 0),
      deviceFingerprint: typeof data.deviceFingerprint === 'string' ? data.deviceFingerprint : undefined,
      browserId: typeof data.browserId === 'string' ? data.browserId : undefined,
    });
  });

  const sameFingerprintCount = byFingerprint.docs.filter((entry) => entry.id !== sessionId).length;
  const sameIpCount = byIp.docs.filter((entry) => entry.id !== sessionId).length;
  const status = deriveStatus({
    alreadyClaimed: hunter.hunter.status === 'CLAIMED',
    sameFingerprintCount,
    sameIpCount,
    fingerprint,
    ip,
  });

  await setDoc(doc(db, claimsCollection, sessionId), {
    sessionId,
    mantraId: hunter.hunter.mantra_id,
    deviceFingerprint: fingerprint,
    browserId,
    ipAddress: ip,
    hunterStatus: hunter.hunter.status,
    sameFingerprintCount,
    sameIpCount,
    status,
    updatedAt: Date.now(),
  });

  const totalUserClaims = historyBySession.has(sessionId) ? historyBySession.size : historyBySession.size + 1;
  const repeatHistory = totalUserClaims > 2
    ? Array.from(historyBySession.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12)
    : [];

  return {
    ok: true,
    message: 'Claim candidate analyzed.',
    status,
    statusLabel: statusLabel(status),
    mantraId: hunter.hunter.mantra_id,
    mantraCode: hunter.hunter.mantra_code,
    sessionId,
    hunterStatus: hunter.hunter.status,
    totalUserClaims,
    repeatHistory,
  };
}

export async function finalizeClaimFromSession(sessionIdRaw: string): Promise<{ ok: boolean; message: string }> {
  const sessionId = normalize(sessionIdRaw);
  if (!sessionId) return { ok: false, message: 'Missing session_id.' };

  const result = await finalizeClaim(sessionId);
  if (!result.ok) return { ok: false, message: result.message };

  const claimRef = doc(db, claimsCollection, sessionId);
  const claimSnap = await getDoc(claimRef);
  if (claimSnap.exists()) {
    const data = claimSnap.data() as Record<string, unknown>;
    await setDoc(claimRef, { ...data, hunterStatus: 'CLAIMED', status: 'claimed', updatedAt: Date.now() });
  }

  return { ok: true, message: 'Claim marked as claimed.' };
}
