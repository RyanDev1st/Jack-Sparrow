'use client';

import { useState } from 'react';
import { getZoneLocations, getZoneRouteSets, type MapSet, type Zone } from '../../lib/mapSetApi';
import { deleteMapSetApi, updateMapSetApi } from '../../lib/mapSetApi';
import MapPreviewZones from './MapPreviewZones';
import MapSetEditorModal from './MapSetEditorModal';
import BreathButton from '../ui/BreathButton';

type MapSetLibraryProps = {
  mapSets: MapSet[];
  onMessage: (message: string) => void;
  onReload: () => Promise<void>;
};

export default function MapSetLibrary({ mapSets, onMessage, onReload }: MapSetLibraryProps) {
  const [expandedMapId, setExpandedMapId] = useState('');
  const [editTarget, setEditTarget] = useState<MapSet | null>(null);

  const onSave = async (next: { zones: Zone[]; fileDataUrl: string; fileName: string; fileType: string }) => {
    if (!editTarget) return;
    const result = await updateMapSetApi({
      ...editTarget,
      zones: next.zones,
      fileDataUrl: next.fileDataUrl,
      fileName: next.fileName,
      fileType: next.fileType,
    });
    onMessage(result.message);
    if (!result.ok) return;
    setEditTarget(null);
    await onReload();
  };

  const onDeleteMap = async (mapSetId: string) => {
    const result = await deleteMapSetApi(mapSetId);
    onMessage(result.message);
    if (!result.ok) return;
    if (expandedMapId === mapSetId) setExpandedMapId('');
    if (editTarget?.id === mapSetId) setEditTarget(null);
    await onReload();
  };

  return (
    <>
      <div className="mt-3 space-y-2">
        {mapSets.map((set) => {
          const locationCount = set.zones.reduce((total, zone) => total + getZoneLocations(zone).length, 0);
          const routeSetCount = set.zones.reduce((total, zone) => total + getZoneRouteSets(zone).length, 0);

          return (
            <div key={set.id} className="rounded-xl border border-white/12 bg-[#020611]/78 p-3 text-xs shadow-[0_14px_28px_rgba(2,6,20,0.45)]">
            <button onClick={() => setExpandedMapId((prev) => (prev === set.id ? '' : set.id))} className="w-full text-left">
              <p className="font-semibold tracking-[0.03em] text-orange-200">{set.name}</p>
              <p className="text-white/70">{set.zones.length} zones, {locationCount} clue entries, {routeSetCount} route sets</p>
            </button>
            {expandedMapId === set.id && (
              <>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Tap map to expand</p>
                  <div className="flex items-center gap-2">
                    <BreathButton type="button" onClick={() => setEditTarget(set)} className="px-2 py-1 text-[10px] uppercase tracking-[0.14em]">
                      Edit Locations
                    </BreathButton>
                    <button type="button" onClick={() => void onDeleteMap(set.id)} className="rounded border border-orange-300/35 bg-[#2a1306] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-orange-100 transition-colors hover:bg-[#3b1a08]">
                      Delete Map
                    </button>
                  </div>
                </div>
                <MapPreviewZones
                  map={set}
                  heightClassName="mt-2 h-56 sm:h-72"
                  fullscreenActionLabel="EDIT LOCATIONS"
                  onFullscreenAction={() => setEditTarget(set)}
                />
              </>
            )}
            </div>
          );
        })}
      </div>
      <MapSetEditorModal mapSet={editTarget} isOpen={Boolean(editTarget)} onClose={() => setEditTarget(null)} onSave={onSave} />
    </>
  );
}
