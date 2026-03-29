import { useEffect, useState } from 'react';

const USER_SESSION_KEY = 'castlevania-user-session-v1';
const USER_COMPLETED_MAPS_KEY = 'castlevania-user-completed-maps-v1';

type SessionStatus = 'HUNTING' | 'FINISHED' | 'CLAIMED';
type SessionProgress = { scanned: number; assigned: number };

type StoredSession = {
  hasStarted?: boolean;
  activeSessionId?: string;
  activeMantraId?: string;
  activeMantraCode?: string;
  activeMapSetId?: string;
  status?: SessionStatus;
  progress?: SessionProgress;
  scannedLocationCodes?: string[];
  message?: string;
};

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const safeRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {}
};

export function useUserSessionState() {
  const [hydrated, setHydrated] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [activeMantraId, setActiveMantraId] = useState('');
  const [activeMantraCode, setActiveMantraCode] = useState('');
  const [activeMapSetId, setActiveMapSetId] = useState('');
  const [message, setMessage] = useState('Scan a valid node to begin validation.');
  const [status, setStatus] = useState<SessionStatus>('HUNTING');
  const [progress, setProgress] = useState<SessionProgress>({ scanned: 0, assigned: 0 });
  const [scannedLocationCodes, setScannedLocationCodes] = useState<string[]>([]);
  const [completedMapSetIds, setCompletedMapSetIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const completedRaw = safeGet(USER_COMPLETED_MAPS_KEY);
      if (completedRaw) {
        try {
          const parsed = JSON.parse(completedRaw) as string[];
          setCompletedMapSetIds(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
        } catch {
          safeRemove(USER_COMPLETED_MAPS_KEY);
        }
      }

      const raw = safeGet(USER_SESSION_KEY);
      if (raw) {
        try {
          const session = JSON.parse(raw) as StoredSession;
          setHasStarted(Boolean(session.hasStarted));
          setActiveSessionId(session.activeSessionId ?? '');
          setActiveMantraId(session.activeMantraId ?? '');
          setActiveMantraCode(session.activeMantraCode ?? '');
          setActiveMapSetId(session.activeMapSetId ?? '');
          setStatus(session.status ?? 'HUNTING');
          setProgress(session.progress ?? { scanned: 0, assigned: 0 });
          setScannedLocationCodes(Array.isArray(session.scannedLocationCodes) ? session.scannedLocationCodes.filter(Boolean) : []);
          setMessage(session.message ?? 'Scan a valid node to begin validation.');
        } catch {
          safeRemove(USER_SESSION_KEY);
        }
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const shouldKeepSession = hasStarted || Boolean(activeSessionId) || Boolean(activeMantraId);
    safeSet(USER_COMPLETED_MAPS_KEY, JSON.stringify(completedMapSetIds));
    safeSet(
      USER_SESSION_KEY,
      JSON.stringify({
        hasStarted: shouldKeepSession,
        activeSessionId,
        activeMantraId,
        activeMantraCode,
        activeMapSetId,
        status,
        progress,
        scannedLocationCodes,
        message,
      }),
    );
  }, [activeMantraCode, activeMantraId, activeMapSetId, activeSessionId, completedMapSetIds, hasStarted, hydrated, message, progress, scannedLocationCodes, status]);

  const resetSession = () => {
    setHasStarted(false);
    setActiveSessionId('');
    setActiveMantraId('');
    setActiveMantraCode('');
    setActiveMapSetId('');
    setStatus('HUNTING');
    setProgress({ scanned: 0, assigned: 0 });
    setScannedLocationCodes([]);
    safeRemove(USER_SESSION_KEY);
  };

  return {
    hydrated,
    hasStarted,
    setHasStarted,
    activeSessionId,
    setActiveSessionId,
    activeMantraId,
    setActiveMantraId,
    activeMantraCode,
    setActiveMantraCode,
    activeMapSetId,
    setActiveMapSetId,
    message,
    setMessage,
    status,
    setStatus,
    progress,
    setProgress,
    scannedLocationCodes,
    setScannedLocationCodes,
    completedMapSetIds,
    setCompletedMapSetIds,
    resetSession,
  };
}
