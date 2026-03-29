import { useEffect, useRef, useState } from 'react';
import QRScanner from '../components/scanner';
import SpaceBackground from '../components/ui/SpaceBackground';
import HunterStatePanel from '../components/user/HunterStatePanel';
import WelcomePanel from '../components/user/WelcomePanel';
import CompletionClaimCard from '../components/user/CompletionClaimCard';
import SiteLegalFooter from '../components/ui/SiteLegalFooter';
import { useUserSessionState } from '../hooks/useUserSessionState';
import { deleteSessionApi, generateMantraApi, validateNodeApi } from '../lib/api';
import { getMapSetByIdApi, type MapSet } from '../lib/mapSetApi';
import castleCrest from '../img/castle.jpg';

const normalizeLocationCode = (value: string): string => String(value ?? '').trim();

export default function Hunt() {
  const {
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
  } = useUserSessionState();
  const [activeMapSet, setActiveMapSet] = useState<MapSet | null>(null);
  const [recentMapSetIds, setRecentMapSetIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationLockRef = useRef(false);
  const sessionActive = hasStarted || Boolean(activeSessionId) || Boolean(activeMantraId);
  const isFinished = status === 'FINISHED' || status === 'CLAIMED';

  const toScanMessage = (result: { ok: boolean; status: 'HUNTING' | 'FINISHED' | 'CLAIMED'; scanned_count: number; assigned_count: number }) => {
    if (!result.ok) {
      return 'Invalid Treasure. This code is not part of your assigned map.';
    }

    if (result.status === 'FINISHED' || result.status === 'CLAIMED') {
      return `TREASURE FOUND! You discovered all ${result.assigned_count} locations. Congratulations, hunter.`;
    }

    return `TREASURE FOUND! Location verified (${result.scanned_count}/${result.assigned_count}).`;
  };

  useEffect(() => {
    if (!activeMapSetId) return;
    void (async () => {
      setActiveMapSet(await getMapSetByIdApi(activeMapSetId));
    })();
  }, [activeMapSetId]);

  const handleGenerateMantra = async () => {
    if (generationLockRef.current) {
      return;
    }

    try {
      generationLockRef.current = true;
      setIsGenerating(true);
      const excludedMapSetIds = Array.from(new Set([...completedMapSetIds, ...recentMapSetIds]));
      const result = await generateMantraApi({ excludedMapSetIds, completedMapSetIds });
      setMessage(result.message);
      if (!result.ok || !result.hunter) {
        return;
      }

      setHasStarted(true);
      setActiveSessionId(result.session_id);
      setActiveMantraId(result.mantra_id);
      setActiveMantraCode(result.mantra_code);
      setActiveMapSetId(result.mapSetId ?? '');
      setActiveMapSet(result.mapSetId ? await getMapSetByIdApi(result.mapSetId) : null);
      if (result.mapSetId) {
        setRecentMapSetIds((prev) => {
          const msId = result.mapSetId!;
          const next = [msId, ...prev.filter((id) => id !== msId)];
          return next.slice(0, 4);
        });
      }
      setStatus(result.hunter.status);
      setProgress({
        scanned: result.hunter?.scanned_nodes.length ?? 0,
        assigned: result.hunter?.assigned_map.length ?? 0,
      });
      setScannedLocationCodes([]);
    } catch {
      setMessage('Unable to generate mantra right now. Check network and retry.');
    } finally {
      generationLockRef.current = false;
      setIsGenerating(false);
    }
  };

  const handlePayload = async (rawText: string) => {
    const payload = normalizeLocationCode(rawText);

    if (!payload) {
      const notice = 'Unreadable QR. Please scan a clear location QR code.';
      setMessage(notice);
      return {
        isCorrect: false,
        title: 'Unreadable QR',
        locationName: 'Unknown Location',
        message: notice,
        continueScanning: true,
      };
    }

    if (!activeSessionId) {
      const notice = 'Generate a mantra before scanning.';
      setMessage(notice);
      return {
        isCorrect: false,
        title: 'No Active Session',
        locationName: 'Unknown Location',
        message: notice,
        continueScanning: true,
      };
    }

    if (/^https?:\/\//i.test(payload)) {
      const notice = 'That QR is a check-in or external link, not a location code for this hunt.';
      setMessage(notice);
      return {
        isCorrect: false,
        title: 'Not A Location QR',
        locationName: 'Unknown Location',
        message: notice,
        continueScanning: true,
      };
    }

    const matchedZone = activeMapSet?.zones.find((zone) => normalizeLocationCode(zone.locationCode) === payload) ?? null;
    const locationName = matchedZone?.name?.trim() || matchedZone?.locationCode?.trim() || 'Unknown Location';

    const result = await validateNodeApi({
      session_id: activeSessionId,
      mantra_id: activeMantraId,
      scanned_payload: payload,
    });

    const feedbackMessage = result.ok
      ? toScanMessage(result)
      : result.message?.trim()
        ? result.message
        : 'Invalid Treasure. This code is not part of your assigned map.';

    setMessage(feedbackMessage);
    setStatus(result.status);
    setProgress({ scanned: result.scanned_count, assigned: result.assigned_count });
    setScannedLocationCodes(result.scanned_nodes ?? []);

    if ((result.status === 'FINISHED' || result.status === 'CLAIMED') && activeMapSetId) {
      setCompletedMapSetIds((prev) => (prev.includes(activeMapSetId) ? prev : [...prev, activeMapSetId]));
    }

    const alreadySolved = !result.ok && /already recorded/i.test(result.message ?? '');
    const title = result.ok
      ? 'Location Verified'
      : alreadySolved
        ? 'Location Already Solved'
        : 'Invalid Location Code';

    return {
      isCorrect: result.ok || alreadySolved,
      title,
      locationName,
      message: feedbackMessage,
      continueScanning: result.ok ? result.status !== 'FINISHED' : true,
    };
  };

  const endSession = async () => {
    if (activeSessionId && status !== 'CLAIMED') {
      try {
        await deleteSessionApi(activeSessionId);
      } catch {
        setMessage('Session ended locally, but mantra cleanup failed on server.');
      }
    }
    setHasStarted(false);
    setActiveSessionId('');
    setActiveMantraId('');
    setActiveMantraCode('');
    setActiveMapSetId('');
    setActiveMapSet(null);
    setScannedLocationCodes([]);
    resetSession();
    setMessage('Session ended. Start now to begin again.');
  };

  if (!hydrated) {
    return (
      <main className="relative grid min-h-screen place-items-center px-5 py-16 text-white sm:px-8">
        <SpaceBackground />
        <div className="rounded-2xl border border-white/20 bg-[#050d1d]/75 px-6 py-4 text-sm text-white/75">Restoring session...</div>
      </main>
    );
  }

  if (!sessionActive) {
    return (
      <main className="relative grid min-h-screen place-items-center px-5 py-16 text-white sm:px-8">
        <SpaceBackground />
        <section className="relative z-10 w-full max-w-2xl space-y-4">
          <WelcomePanel
            crestSrc={castleCrest}
            message={message}
            isGenerating={isGenerating}
            onStart={() => void handleGenerateMantra()}
          />
          <SiteLegalFooter compact />
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-16 text-white sm:px-8">
      <SpaceBackground />

      <section className="relative mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mx-auto mb-3 max-w-md rounded-lg border border-white/15 bg-[#020611]/70 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/75">
            Live Scanner {status === 'HUNTING' ? 'Active' : status}
          </div>
          {activeMantraId ? (
            <QRScanner onPayload={handlePayload} className="mx-auto max-w-md" />
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-white/20 bg-[#050d1d]/75 p-6 text-sm text-white/75">
              Start your hunt to unlock the scanner.
            </div>
          )}
        </div>

        <HunterStatePanel
          mantraId={activeMantraId}
          mantraCode={activeMantraCode}
          mapSet={activeMapSet}
          scannedLocationCodes={scannedLocationCodes}
          status={status}
          progress={progress}
          message={message}
          onEndSession={() => void endSession()}
        />
      </section>

      {isFinished && (
        <CompletionClaimCard sessionId={activeSessionId} mantraId={activeMantraId} mantraCode={activeMantraCode} onReset={() => void endSession()} />
      )}

      <section className="relative mx-auto mt-6 max-w-4xl">
        <SiteLegalFooter />
      </section>
    </main>
  );
}
