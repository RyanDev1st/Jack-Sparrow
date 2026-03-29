import MapPreviewZones from '../admin/MapPreviewZones';
import type { MapSet } from '../../lib/mapSetApi';
import RiddleText from './RiddleText';
import BreathButton from '../ui/BreathButton';

type HunterStatePanelProps = {
  mantraId: string;
  mantraCode: string;
  mapSet: MapSet | null;
  scannedLocationCodes: string[];
  status: 'HUNTING' | 'FINISHED' | 'CLAIMED';
  progress: { scanned: number; assigned: number };
  message: string;
  onEndSession: () => void;
};

export default function HunterStatePanel({
  mantraId,
  mantraCode,
  mapSet,
  scannedLocationCodes,
  status,
  progress,
  message,
  onEndSession,
}: HunterStatePanelProps) {
  const isInvalidTreasure = message.toLowerCase().includes('invalid treasure');
  const isTreasureFound = message.toLowerCase().includes('treasure found');
  const scannedSet = new Set(scannedLocationCodes.map((code) => String(code ?? '').trim()));
  const riddles = mapSet?.zones
    .filter((zone) => !scannedSet.has(String(zone.locationCode ?? '').trim()))
    .map((zone) => ({ id: zone.id, label: zone.name || zone.locationCode || 'Unknown', text: zone.riddle?.trim() || '' }))
    .filter((entry) => entry.text.length > 0) ?? [];
  const statusTone = status === 'CLAIMED' ? 'text-green-300 border-green-400/40 bg-green-900/20' : status === 'FINISHED' ? 'text-orange-200 border-orange-300/40 bg-orange-900/20' : 'text-blue-200 border-blue-300/40 bg-blue-900/20';

  return (
    <div className="h-fit rounded-2xl border border-white/20 bg-[#050d1d]/75 p-6 backdrop-blur-md shadow-[0_20px_50px_rgba(3,8,24,0.55)]">
      <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Hunter State</p>
      <div className="mt-3 rounded-lg border border-green-400/40 bg-green-900/15 px-3 py-2">
        <p className="text-sm font-mono font-bold text-green-300">{mantraCode?.trim() || 'MANTRA ACTIVE'}</p>
      </div>
      <p className="mt-2 break-all text-xs text-white/80">{mantraId}</p>

      <div className="mt-4 rounded-lg border border-white/12 bg-[#020611]/70 p-3">
        {mapSet ? (
          <>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-orange-200">Assigned Map</p>
            <MapPreviewZones map={mapSet} heightClassName="h-48" />
          </>
        ) : (
          <p className="text-sm text-white/60">No map preview found.</p>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-white/85">
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${statusTone}`}>{status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Progress</span>
          <span className="font-semibold text-orange-200">{progress.scanned}/{progress.assigned}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-orange-400/70 to-orange-500/70 shadow-[0_0_10px_rgba(245,130,32,0.35)]"
            style={{ width: `${(progress.scanned / Math.max(1, progress.assigned)) * 100}%` }}
          />
        </div>
      </div>

      {riddles.length > 0 && (
        <div className="mt-4 rounded-lg border border-white/12 bg-[#020611]/70 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-orange-200">Location Riddles</p>
          <div className="mt-2 space-y-2">
            {riddles.map((entry) => (
              <div key={entry.id} className="rounded border border-white/10 bg-[#09142a]/70 px-2 py-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">{entry.label}</p>
                <RiddleText text={entry.text} zones={mapSet?.zones ?? []} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`mt-5 rounded-lg border p-3 text-sm leading-relaxed ${
          isInvalidTreasure
            ? 'border-orange-300/35 bg-[#2a1306]/65 text-orange-100'
            : isTreasureFound
              ? 'border-orange-300/45 bg-[#1f1a06]/65 text-orange-100'
              : 'border-white/12 bg-[#020611]/70 text-white/80'
        }`}
      >
        {message}
      </div>

      <BreathButton onClick={onEndSession} className="mt-4 w-full justify-center text-xs tracking-[0.16em]">
        END SESSION
      </BreathButton>

      <p className="mt-4 text-xs text-white/55">For safety, URL-like QR content is ignored. Only raw location codes are accepted.</p>
    </div>
  );
}
