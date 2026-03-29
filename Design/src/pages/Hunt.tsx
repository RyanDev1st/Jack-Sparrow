import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  LoaderCircle,
  MapPinned,
  Radar,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import QRScanner from '../components/scanner';
import SpaceBackground from '../components/ui/SpaceBackground';
import CompletionClaimCard from '../components/user/CompletionClaimCard';
import SiteLegalFooter from '../components/ui/SiteLegalFooter';
import BreathButton from '../components/ui/BreathButton';
import GlassCard from '../components/ui/GlassCard';
import MapPreviewZones from '../components/admin/MapPreviewZones';
import RiddleText from '../components/user/RiddleText';
import { useUserSessionState } from '../hooks/useUserSessionState';
import { deleteSessionApi, generateMantraApi, validateNodeApi } from '../lib/api';
import {
  getMapLocationByCode,
  getMapSetByIdApi,
  getZoneLocations,
  type MapSet,
  type Zone,
  type ZoneLocation,
} from '../lib/mapSetApi';

const normalizeLocationCode = (value: string): string => String(value ?? '').trim();

type MobileSectionId = 'scanner' | 'intel' | 'progress';
type ActivityTone = 'info' | 'success' | 'warning' | 'error';

type ActivityItem = {
  id: string;
  tone: ActivityTone;
  title: string;
  message: string;
};

type ZoneIntel = {
  zone: Zone;
  locations: ZoneLocation[];
};

const MOBILE_SECTIONS: Array<{ id: MobileSectionId; label: string; icon: typeof Radar }> = [
  { id: 'scanner', label: 'Scan', icon: Radar },
  { id: 'intel', label: 'Map', icon: MapPinned },
  { id: 'progress', label: 'Progress', icon: ShieldCheck },
];

const toneStyles: Record<ActivityTone, string> = {
  info: 'border-white/10 bg-white/[0.04] text-white/80',
  success: 'border-emerald-400/28 bg-emerald-500/10 text-emerald-100',
  warning: 'border-orange-300/30 bg-orange-500/10 text-orange-100',
  error: 'border-rose-300/28 bg-rose-500/10 text-rose-100',
};

function SectionCard({
  eyebrow,
  title,
  actions,
  children,
  className = '',
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard
      className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,11,22,0.9)_0%,rgba(3,6,14,0.9)_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.34)] ${className}`}
      style={{ padding: 0 }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_40%)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_72%)]" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-display text-[10px] uppercase tracking-[0.36em] text-orange-200/68">{eyebrow}</p>
            <h2 className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-white sm:text-[1.65rem]">{title}</h2>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </GlassCard>
  );
}

function InlineBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">{label}</span>
      <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">{value}</span>
    </div>
  );
}

export default function Hunt() {
  const navigate = useNavigate();
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
    activeAssignedClueIds,
    setActiveAssignedClueIds,
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
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [mobileSection, setMobileSection] = useState<MobileSectionId>('scanner');
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const generationLockRef = useRef(false);
  const autoGenerateAttemptedRef = useRef(false);

  const isMobile = viewportWidth < 1024;
  const sessionActive = hasStarted || Boolean(activeSessionId) || Boolean(activeMantraId);
  const isFinished = status === 'FINISHED' || status === 'CLAIMED';

  const pushActivity = useCallback((tone: ActivityTone, title: string, nextMessage: string) => {
    setActivityFeed((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tone,
        title,
        message: nextMessage,
      },
      ...prev,
    ].slice(0, 4));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!activeMapSetId) {
      setActiveMapSet(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const next = await getMapSetByIdApi(activeMapSetId);
      if (!cancelled) {
        setActiveMapSet(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeMapSetId]);

  const handleGenerateMantra = useCallback(async () => {
    if (generationLockRef.current) {
      return;
    }

    try {
      generationLockRef.current = true;
      setIsGenerating(true);
      setMessage('Preparing your hunt sheet...');
      const excludedMapSetIds = Array.from(new Set([...completedMapSetIds, ...recentMapSetIds]));
      const result = await generateMantraApi({ excludedMapSetIds, completedMapSetIds });
      setMessage(result.message);

      if (!result.ok || !result.hunter) {
        pushActivity('error', 'Hunt sheet unavailable', result.message || 'Unable to assign a hunt sheet right now.');
        return;
      }

      setHasStarted(true);
      setActiveSessionId(result.session_id);
      setActiveMantraId(result.mantra_id);
      setActiveMantraCode(result.mantra_code);
      setActiveMapSetId(result.mapSetId ?? '');
      setActiveAssignedClueIds(result.assignedClueIds ?? result.hunter?.assigned_clue_ids ?? []);
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
      pushActivity('info', 'Hunt sheet ready', result.message || 'Your mantra and assigned map are live.');
    } catch {
      const nextMessage = 'Unable to assign a hunt sheet right now. Check network and retry.';
      setMessage(nextMessage);
      pushActivity('error', 'Assignment failed', nextMessage);
    } finally {
      generationLockRef.current = false;
      setIsGenerating(false);
    }
  }, [
    completedMapSetIds,
    pushActivity,
    recentMapSetIds,
    setActiveMantraCode,
    setActiveMantraId,
    setActiveMapSetId,
    setActiveSessionId,
    setHasStarted,
    setMessage,
    setProgress,
    setScannedLocationCodes,
    setStatus,
    setActiveAssignedClueIds,
  ]);

  useEffect(() => {
    if (!hydrated || sessionActive || autoGenerateAttemptedRef.current) {
      return;
    }
    autoGenerateAttemptedRef.current = true;
    void handleGenerateMantra();
  }, [handleGenerateMantra, hydrated, sessionActive]);

  const handlePayload = useCallback(async (rawText: string) => {
    const payload = normalizeLocationCode(rawText);

    if (!payload) {
      const notice = 'Unreadable QR. Please scan a clear location QR code.';
      setMessage(notice);
      pushActivity('warning', 'Unreadable code', notice);
      return {
        isCorrect: false,
        title: 'Unreadable QR',
        locationName: 'Unknown Location',
        message: notice,
        continueScanning: true,
      };
    }

    if (!activeSessionId) {
      const notice = 'No live hunt session is active.';
      setMessage(notice);
      pushActivity('warning', 'No active session', notice);
      return {
        isCorrect: false,
        title: 'No Active Session',
        locationName: 'Unknown Location',
        message: notice,
        continueScanning: true,
      };
    }

    if (/^https?:\/\//i.test(payload)) {
      const notice = 'That QR is a check-in or external link, not a hunt location code.';
      setMessage(notice);
      pushActivity('warning', 'Ignored link QR', notice);
      return {
        isCorrect: false,
        title: 'Not A Location QR',
        locationName: 'Unknown Location',
        message: notice,
        continueScanning: true,
      };
    }

    const matchedLocation = activeMapSet ? getMapLocationByCode(activeMapSet, payload) : null;
    const locationName = matchedLocation?.name?.trim() || matchedLocation?.zoneName?.trim() || 'Unknown Location';

    const result = await validateNodeApi({
      session_id: activeSessionId,
      mantra_id: activeMantraId,
      scanned_payload: payload,
    });

    const feedbackMessage = result.ok
      ? result.status === 'FINISHED' || result.status === 'CLAIMED'
        ? `Treasure verified. All ${result.assigned_count} assigned locations are now complete.`
        : `Treasure verified. Progress updated to ${result.scanned_count}/${result.assigned_count}.`
      : result.message?.trim()
        ? result.message
        : 'Invalid treasure. This code is not part of your assigned map.';

    setMessage(feedbackMessage);
    setStatus(result.status);
    setProgress({ scanned: result.scanned_count, assigned: result.assigned_count });
    setScannedLocationCodes(result.scanned_nodes ?? []);
    setActiveAssignedClueIds(result.assigned_clue_ids ?? activeAssignedClueIds);

    if ((result.status === 'FINISHED' || result.status === 'CLAIMED') && activeMapSetId) {
      setCompletedMapSetIds((prev) => (prev.includes(activeMapSetId) ? prev : [...prev, activeMapSetId]));
    }

    const alreadySolved = !result.ok && /already recorded/i.test(result.message ?? '');
    const title = result.ok
      ? result.status === 'FINISHED' || result.status === 'CLAIMED'
        ? 'Hunt Sheet Complete'
        : 'Treasure Verified'
      : alreadySolved
        ? 'Location Already Solved'
        : 'Invalid Location Code';

    pushActivity(
      result.ok ? 'success' : alreadySolved ? 'info' : 'error',
      title,
      `${locationName}: ${feedbackMessage}`,
    );

    return {
      isCorrect: result.ok || alreadySolved,
      title,
      locationName,
      message: feedbackMessage,
      continueScanning: result.ok ? result.status !== 'FINISHED' : true,
    };
  }, [
    activeMapSet,
    activeMapSetId,
    activeMantraId,
    activeSessionId,
    pushActivity,
    setCompletedMapSetIds,
    setMessage,
    setProgress,
    setScannedLocationCodes,
    setStatus,
    activeAssignedClueIds,
    setActiveAssignedClueIds,
  ]);

  const endSession = useCallback(async () => {
    const currentSessionId = activeSessionId;
    const shouldDelete = currentSessionId && status !== 'CLAIMED';

    if (shouldDelete) {
      try {
        await deleteSessionApi(currentSessionId);
      } catch {
        pushActivity('warning', 'Cleanup delayed', 'Session ended locally, but server cleanup did not finish.');
      }
    }

    resetSession();
    setHasStarted(false);
    setActiveSessionId('');
    setActiveMantraId('');
    setActiveMantraCode('');
    setActiveMapSetId('');
    setActiveAssignedClueIds([]);
    setActiveMapSet(null);
    setScannedLocationCodes([]);
    setMessage('Session ended.');
    navigate('/');
  }, [
    activeSessionId,
    navigate,
    pushActivity,
    resetSession,
    setActiveMantraCode,
    setActiveMantraId,
    setActiveMapSetId,
    setActiveSessionId,
    setHasStarted,
    setMessage,
    setScannedLocationCodes,
    setActiveAssignedClueIds,
    status,
  ]);

  const scannedSet = useMemo(
    () => new Set(scannedLocationCodes.map((code) => normalizeLocationCode(code))),
    [scannedLocationCodes],
  );

  const assignedClueIdSet = useMemo(
    () => new Set(activeAssignedClueIds.map((id) => String(id).trim()).filter(Boolean)),
    [activeAssignedClueIds],
  );

  const assignedZoneIntel = useMemo<ZoneIntel[]>(() => {
    if (!activeMapSet) return [];

    return activeMapSet.zones
      .map((zone) => {
        const locations = getZoneLocations(zone);
        if (assignedClueIdSet.size === 0) {
          return { zone, locations };
        }

        const assignedLocations = locations.filter((location) => assignedClueIdSet.has(location.id));
        return assignedLocations.length > 0 ? { zone, locations: assignedLocations } : null;
      })
      .filter((entry): entry is ZoneIntel => entry !== null);
  }, [activeMapSet, assignedClueIdSet]);

  const solvedLocations = useMemo(
    () => assignedZoneIntel.flatMap((entry) => entry.locations.filter((location) => scannedSet.has(normalizeLocationCode(location.locationCode))).map((location) => ({ zone: entry.zone, location }))),
    [assignedZoneIntel, scannedSet],
  );

  const remainingZoneIntel = useMemo(
    () => assignedZoneIntel.map((entry) => ({
      zone: entry.zone,
      locations: entry.locations.filter((location) => !scannedSet.has(normalizeLocationCode(location.locationCode))),
    })).filter((entry) => entry.locations.length > 0),
    [assignedZoneIntel, scannedSet],
  );

  const remainingLocations = useMemo(
    () => remainingZoneIntel.flatMap((entry) => entry.locations.map((location) => ({ zone: entry.zone, location }))),
    [remainingZoneIntel],
  );

  const progressRatio = progress.assigned > 0 ? progress.scanned / progress.assigned : 0;
  const statusLabel = status === 'CLAIMED' ? 'Check-in cleared' : status === 'FINISHED' ? 'Awaiting check-in' : 'Hunt active';
  const currentMessageTone: ActivityTone =
    /invalid|unable|not part|failed/i.test(message) ? 'error'
      : /complete|congratulations|verified|found/i.test(message) ? 'success'
        : /ignore|already|no live/i.test(message) ? 'warning'
          : 'info';

  const scannerSection = (
    <SectionCard
      eyebrow="Scanner"
      title="Live Capture"
      actions={(
        <div className="flex flex-wrap justify-end gap-2">
          <InlineBadge label="Status" value={statusLabel} />
          <InlineBadge label="Mantra" value={activeMantraCode || 'LIVE'} />
        </div>
      )}
      className="h-full"
    >
      <div className="space-y-4">
        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,16,0.86)_0%,rgba(4,8,18,0.72)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4">
          <div className="rounded-[22px] border border-white/8 bg-[#020611]/78 p-2">
            <QRScanner onPayload={handlePayload} className="mx-auto w-full max-w-[46rem]" fps={22} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Session</p>
            <p className="mt-2 text-lg font-semibold text-white">{activeSessionId ? 'Live' : 'Idle'}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Check-In</p>
            <p className="mt-2 text-lg font-semibold text-white">{status === 'CLAIMED' ? 'Cleared' : status === 'FINISHED' ? 'Ready' : 'Pending'}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Capture</p>
            <p className="mt-2 text-lg font-semibold text-white">Assigned Clues</p>
          </div>
        </div>
      </div>
    </SectionCard>
  );

  const intelSection = (
    <SectionCard
      eyebrow="Map"
      title="Assigned Route"
      className="h-full"
    >
      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(3,7,16,0.84)_0%,rgba(4,8,18,0.72)_100%)] p-3 sm:p-4">
          {activeMapSet ? (
            <MapPreviewZones map={activeMapSet} heightClassName={isMobile ? 'h-64' : 'h-80'} />
          ) : (
            <div className="grid min-h-64 place-items-center rounded-[18px] border border-dashed border-white/12 bg-white/[0.02] text-sm text-white/50">
              Map unavailable.
            </div>
          )}
        </div>

        <div className="grid max-h-[28rem] gap-3 overflow-auto pr-1">
          {remainingZoneIntel.length > 0 ? (
            remainingZoneIntel.map(({ zone, locations }, index) => (
              <div key={zone.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.26em] text-orange-200/70">Zone {index + 1}</p>
                    <p className="mt-2 font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-white/92">{zone.name || 'Unnamed Zone'}</p>
                  </div>
                  <div className="rounded-full border border-white/12 bg-[#061127]/82 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/54">
                    {locations.length} clue{locations.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {locations.map((location, clueIndex) => (
                    <div key={location.id} className="rounded-[18px] border border-white/8 bg-[#020611]/62 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/38">Clue {clueIndex + 1}</p>
                          <p className="mt-2 font-display text-[1rem] font-semibold tracking-[-0.02em] text-white/92">{location.name || zone.name || 'Location'}</p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white/50">
                          Hidden Code
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/64">{location.description?.trim() || 'Location detail unavailable.'}</p>
                      <div className="mt-3 rounded-[16px] border border-white/8 bg-[#030916]/78 px-4 py-3">
                        <RiddleText text={location.riddle?.trim() || 'No riddle provided for this clue.'} zones={activeMapSet?.zones ?? []} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-emerald-400/18 bg-emerald-500/8 px-4 py-5 text-sm text-emerald-100/90">
              Route cleared. Proceed to check-in.
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );

  const progressSection = (
    <SectionCard
      eyebrow="Progress"
      title="Run State"
      actions={(
        <BreathButton
          onClick={() => void endSession()}
          className="px-4 py-2 text-[11px] tracking-[0.18em]"
        >
          END HUNT
        </BreathButton>
      )}
      className="h-full"
    >
      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(3,7,16,0.82)_0%,rgba(4,8,18,0.72)_100%)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Mantra</p>
              <p className="mt-2 font-display text-[1.55rem] font-semibold tracking-[0.08em] text-orange-100">{activeMantraCode || 'LIVE'}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/38">{statusLabel}</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Cleared</p>
              <p className="mt-1 text-2xl font-semibold text-white">{progress.scanned}/{progress.assigned}</p>
            </div>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(245,130,32,0.85)_0%,rgba(255,199,120,0.92)_100%)] shadow-[0_0_16px_rgba(245,130,32,0.24)]"
              style={{ width: `${Math.max(6, progressRatio * 100)}%` }}
            />
          </div>
        </div>

          <div className={`rounded-[22px] border px-4 py-4 ${toneStyles[currentMessageTone]}`}>
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <p className="text-[10px] uppercase tracking-[0.24em]">Notice</p>
            </div>
            <p className="mt-3 text-sm leading-6">{message}</p>
          </div>

        <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center gap-2 text-emerald-100">
                <ShieldCheck size={16} />
                <p className="text-[10px] uppercase tracking-[0.22em]">Confirmed</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{solvedLocations.length}</p>
            <div className="mt-3 space-y-2 text-sm text-white/60">
              {solvedLocations.length > 0 ? solvedLocations.slice(0, 4).map(({ zone, location }) => (
                <div key={location.id} className="rounded-xl border border-emerald-400/16 bg-emerald-500/8 px-3 py-2">
                  {location.name || zone.name || 'Solved clue'}
                </div>
              )) : <p>No treasures verified yet.</p>}
            </div>
          </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center gap-2 text-orange-100">
                <Compass size={16} />
                <p className="text-[10px] uppercase tracking-[0.22em]">Pending</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{remainingLocations.length}</p>
            <div className="mt-3 space-y-2 text-sm text-white/60">
              {remainingLocations.length > 0 ? remainingLocations.slice(0, 4).map(({ zone, location }) => (
                <div key={location.id} className="rounded-xl border border-white/10 bg-[#061127]/72 px-3 py-2">
                  {location.name || zone.name || 'Pending clue'}
                </div>
              )) : <p>All assigned zones are solved.</p>}
            </div>
          </div>
        </div>

          <div className="rounded-[22px] border border-white/10 bg-[#020611]/54 p-4">
            <div className="flex items-center gap-2 text-white/90">
              <ScrollText size={16} className="text-orange-200" />
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Log</p>
            </div>
            <div className="mt-4 space-y-3">
            {activityFeed.length > 0 ? activityFeed.map((entry) => (
              <div key={entry.id} className={`rounded-2xl border px-4 py-3 ${toneStyles[entry.tone]}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">{entry.title}</p>
                <p className="mt-2 text-sm leading-6">{entry.message}</p>
              </div>
            )) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/55">
                Scanner updates will appear here once the hunt begins.
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );

  if (!hydrated) {
    return (
      <main className="relative grid min-h-[100svh] place-items-center px-5 py-16 text-white sm:px-8">
        <SpaceBackground />
        <GlassCard className="w-full max-w-md rounded-[26px] border border-white/12 bg-[#050d1d]/78 px-6 py-6 text-center">
          <LoaderCircle className="mx-auto animate-spin text-orange-200" size={28} />
          <p className="mt-4 text-sm tracking-[0.18em] text-white/60 uppercase">Restoring hunt state</p>
        </GlassCard>
      </main>
    );
  }

  if (!sessionActive) {
    return (
      <main className="relative grid min-h-[100svh] place-items-center px-5 py-16 text-white sm:px-8">
        <SpaceBackground />
        <section className="relative z-10 w-full max-w-lg space-y-4">
          <GlassCard className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(6,10,20,0.88)_0%,rgba(4,8,18,0.78)_100%)] px-7 py-8 text-center">
            <LoaderCircle className={`mx-auto ${isGenerating ? 'animate-spin' : ''} text-orange-200`} size={30} />
            <p className="mt-5 text-[11px] uppercase tracking-[0.32em] text-orange-200/72">Treasure Hunt</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">Preparing The Hunt</h1>
            <div className={`mt-6 rounded-[22px] border px-4 py-4 ${toneStyles[currentMessageTone]}`}>
              <p className="text-sm leading-6">{message}</p>
            </div>
            {!isGenerating && (
              <BreathButton onClick={() => void handleGenerateMantra()} className="mt-6 px-6 py-3 text-sm tracking-[0.18em]">
                RETRY PREP
              </BreathButton>
            )}
          </GlassCard>
          <SiteLegalFooter compact />
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <SpaceBackground />

      <section className="relative z-10 mx-auto max-w-[1560px]">
        <div className="mb-5 flex flex-col gap-4 rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,11,22,0.82)_0%,rgba(4,8,18,0.72)_100%)] px-5 py-5 shadow-[0_24px_64px_rgba(0,0,0,0.28)] sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.38em] text-orange-200/72">Castlevania Treasure Hunt</p>
            <h1 className="mt-3 font-display text-[2.2rem] font-semibold tracking-[-0.04em] text-white sm:text-[3rem]">Scanner Deck</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50 sm:text-[15px]">
              Capture. Read the route. Clear the board.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <InlineBadge label="Session" value={activeSessionId ? 'Live' : 'Offline'} />
            <InlineBadge label="Check-in" value={status === 'CLAIMED' ? 'Cleared' : status === 'FINISHED' ? 'Ready' : 'Pending'} />
            <InlineBadge label="Solved" value={`${progress.scanned}/${progress.assigned}`} />
          </div>
        </div>

        {isMobile ? (
          <div className="pb-28">
            <div className="space-y-4">
              {mobileSection === 'scanner' && scannerSection}
              {mobileSection === 'intel' && intelSection}
              {mobileSection === 'progress' && progressSection}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
            <div>{scannerSection}</div>
            <div className="grid gap-5 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
              {intelSection}
              {progressSection}
            </div>
          </div>
        )}

        <section className="relative z-10 mx-auto mt-5 max-w-[1560px]">
          <SiteLegalFooter compact={isMobile} />
        </section>
      </section>

      {isMobile && (
        <nav
          className="fixed bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 z-30 flex w-[min(94vw,30rem)] -translate-x-1/2 items-center justify-between rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,13,26,0.9)_0%,rgba(5,8,18,0.84)_100%)] p-2 shadow-[0_24px_50px_rgba(0,0,0,0.38)] backdrop-blur-xl"
          aria-label="Treasure hunt sections"
        >
          {MOBILE_SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = mobileSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMobileSection(id)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  active
                    ? 'bg-orange-500/16 text-orange-100 shadow-[0_0_18px_rgba(245,130,32,0.16)]'
                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {isFinished && (
        <CompletionClaimCard
          sessionId={activeSessionId}
          mantraId={activeMantraId}
          mantraCode={activeMantraCode}
          onReset={() => void endSession()}
        />
      )}
    </main>
  );
}
