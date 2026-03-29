'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import BreathButton from '../ui/BreathButton';
import ZoneCircle from '../ui/ZoneCircle';
import { clampPercent, percentToRadius, radiusToPercent } from '../../lib/zoneGeometry';
import { useContainedMediaFrame } from '../../hooks/useContainedMediaFrame';
import {
  getZoneLocations,
  getZoneRouteSets,
  type Zone,
  type ZoneLocation,
  type ZoneRouteSet,
} from '../../lib/mapSetApi';

const EMPTY_ZONES: Zone[] = [];

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

type MapSetWorkbenchProps = {
  initialName?: string;
  initialFileDataUrl?: string;
  initialFileName?: string;
  initialFileType?: string;
  initialZones?: Zone[];
  saveLabel: string;
  showNameField?: boolean;
  onSave: (next: { name: string; fileDataUrl: string; fileName: string; fileType: string; zones: Zone[] }) => Promise<void>;
  onCancel?: () => void;
};

const createLocation = (zoneId: string, index: number): ZoneLocation => ({
  id: `${zoneId}-loc-${Date.now().toString(36)}-${index + 1}`,
  name: `Location ${index + 1}`,
  locationCode: '',
  description: '',
  riddle: '',
});

const createRouteSet = (zoneId: string, index: number, seedLocationIds: string[]): ZoneRouteSet => ({
  id: `${zoneId}-set-${Date.now().toString(36)}-${index + 1}`,
  name: `Set ${index + 1}`,
  locationIds: seedLocationIds.slice(0, Math.max(1, seedLocationIds.length)),
});

const createZone = (index: number, shape: Zone['shape'] = 'circle'): Zone => {
  const id = `zone-${Date.now().toString(36)}-${index + 1}`;
  const firstLocation = createLocation(id, 0);
  return {
    id,
    x: 50,
    y: 50,
    radius: 5.8,
    radiusX: 5.8,
    radiusY: shape === 'oval' ? 8.8 : 5.8,
    rotation: 0,
    shape,
    color: ['#f58220', '#3ba7ff', '#57d27f', '#f6c945'][index % 4],
    name: `Zone ${index + 1}`,
    locations: [firstLocation],
    routeSets: [createRouteSet(id, 0, [firstLocation.id])],
  };
};

export default function MapSetWorkbench({
  initialName = '',
  initialFileDataUrl = '',
  initialFileName = '',
  initialFileType = '',
  initialZones = EMPTY_ZONES,
  saveLabel,
  showNameField = true,
  onSave,
  onCancel,
}: MapSetWorkbenchProps) {
  const [name, setName] = useState(initialName);
  const [fileDataUrl, setFileDataUrl] = useState(initialFileDataUrl);
  const [fileName, setFileName] = useState(initialFileName);
  const [fileType, setFileType] = useState(initialFileType);
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZoneId, setSelectedZoneId] = useState(initialZones[0]?.id ?? '');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedRouteSetId, setSelectedRouteSetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const initialSnapshotRef = useRef('');
  const { containerRef, frame, containerSize, onImageLoad } = useContainedMediaFrame();

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        initialName,
        initialFileDataUrl,
        initialFileName,
        initialFileType,
        initialZones,
      }),
    [initialFileDataUrl, initialFileName, initialFileType, initialName, initialZones],
  );

  useEffect(() => {
    if (initialSnapshotRef.current === initialSnapshot) return;
    initialSnapshotRef.current = initialSnapshot;
    setName(initialName);
    setFileDataUrl(initialFileDataUrl);
    setFileName(initialFileName);
    setFileType(initialFileType);
    setZones(initialZones);
    setSelectedZoneId(initialZones[0]?.id ?? '');
    const firstZone = initialZones[0];
    setSelectedLocationId(firstZone ? getZoneLocations(firstZone)[0]?.id ?? '' : '');
    setSelectedRouteSetId(firstZone ? getZoneRouteSets(firstZone)[0]?.id ?? '' : '');
  }, [initialFileDataUrl, initialFileName, initialFileType, initialName, initialSnapshot, initialZones]);

  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId) ?? null, [zones, selectedZoneId]);
  const zoneLocations = useMemo(() => (selectedZone ? getZoneLocations(selectedZone) : []), [selectedZone]);
  const routeSets = useMemo(() => (selectedZone ? getZoneRouteSets(selectedZone) : []), [selectedZone]);
  const selectedLocation = useMemo(() => zoneLocations.find((location) => location.id === selectedLocationId) ?? zoneLocations[0] ?? null, [selectedLocationId, zoneLocations]);
  const selectedRouteSet = useMemo(() => routeSets.find((routeSet) => routeSet.id === selectedRouteSetId) ?? routeSets[0] ?? null, [routeSets, selectedRouteSetId]);

  useEffect(() => {
    if (!selectedZone) return;
    if (!selectedLocation && zoneLocations[0]) setSelectedLocationId(zoneLocations[0].id);
    if (!selectedRouteSet && routeSets[0]) setSelectedRouteSetId(routeSets[0].id);
  }, [routeSets, selectedLocation, selectedRouteSet, selectedZone, zoneLocations]);

  const updateZone = (zoneId: string, updater: (zone: Zone) => Zone) => {
    setZones((prev) => prev.map((zone) => (zone.id === zoneId ? updater(zone) : zone)));
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    const isAllowed = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isAllowed) {
      setMessage('Only image or PDF is allowed.');
      return;
    }

    setFileDataUrl(await toDataUrl(file));
    setFileName(file.name);
    setFileType(file.type);
    setMessage('');
  };

  const addZone = (shape: Zone['shape']) => {
    const next = createZone(zones.length, shape);
    setZones((prev) => [...prev, next]);
    setSelectedZoneId(next.id);
    setSelectedLocationId(next.locations?.[0]?.id ?? '');
    setSelectedRouteSetId(next.routeSets?.[0]?.id ?? '');
  };

  const deleteSelectedZone = () => {
    if (!selectedZone) return;
    const nextZones = zones.filter((zone) => zone.id !== selectedZone.id);
    setZones(nextZones);
    const fallbackZone = nextZones[0] ?? null;
    setSelectedZoneId(fallbackZone?.id ?? '');
    setSelectedLocationId(fallbackZone ? getZoneLocations(fallbackZone)[0]?.id ?? '' : '');
    setSelectedRouteSetId(fallbackZone ? getZoneRouteSets(fallbackZone)[0]?.id ?? '' : '');
  };

  const startDrag = (zoneId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    const canvas = containerRef.current;
    if (!canvas) return;
    event.preventDefault();
    setSelectedZoneId(zoneId);

    const move = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      updateZone(zoneId, (zone) => ({ ...zone, x: clampPercent(x), y: clampPercent(y) }));
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const updateSelectedZone = (patch: Partial<Zone>) => {
    if (!selectedZone) return;
    updateZone(selectedZone.id, (zone) => {
      const nextShape = patch.shape ?? zone.shape ?? 'circle';
      const nextRadiusX = patch.radiusX ?? zone.radiusX ?? zone.radius;
      const nextRadiusY = nextShape === 'circle' ? nextRadiusX : patch.radiusY ?? zone.radiusY ?? zone.radius;
      return {
        ...zone,
        ...patch,
        shape: nextShape,
        radius: nextRadiusX,
        radiusX: nextRadiusX,
        radiusY: nextRadiusY,
      };
    });
  };

  const updateSelectedLocation = (patch: Partial<ZoneLocation>) => {
    if (!selectedZone || !selectedLocation) return;
    updateZone(selectedZone.id, (zone) => ({
      ...zone,
      locations: getZoneLocations(zone).map((location) => (location.id === selectedLocation.id ? { ...location, ...patch } : location)),
    }));
  };

  const addLocation = () => {
    if (!selectedZone) return;
    const nextLocation = createLocation(selectedZone.id, zoneLocations.length);
    updateZone(selectedZone.id, (zone) => {
      const nextLocations = [...getZoneLocations(zone), nextLocation];
      const nextRouteSets = getZoneRouteSets(zone);
      return {
        ...zone,
        locations: nextLocations,
        routeSets:
          nextRouteSets.length > 0
            ? nextRouteSets
            : [createRouteSet(zone.id, 0, [nextLocation.id])],
      };
    });
    setSelectedLocationId(nextLocation.id);
  };

  const deleteLocation = (locationId: string) => {
    if (!selectedZone) return;
    const target = zoneLocations.find((location) => location.id === locationId);
    if (!target) return;
    if (selectedLocation?.id !== locationId) {
      setSelectedLocationId(locationId);
    }
    const fallbackLocation = zoneLocations.find((location) => location.id !== locationId) ?? null;
    updateZone(selectedZone.id, (zone) => {
      const remainingLocations = getZoneLocations(zone).filter((location) => location.id !== locationId);
      const remainingIds = new Set(remainingLocations.map((location) => location.id));
      const nextRouteSets = getZoneRouteSets(zone)
        .map((routeSet) => ({
          ...routeSet,
          locationIds: routeSet.locationIds.filter((entryId) => remainingIds.has(entryId)),
        }))
        .filter((routeSet) => routeSet.locationIds.length > 0);

      return {
        ...zone,
        locations: remainingLocations,
        routeSets: remainingLocations.length > 0
          ? nextRouteSets.length > 0
            ? nextRouteSets
            : [createRouteSet(zone.id, 0, [remainingLocations[0].id])]
          : [],
      };
    });
    setSelectedLocationId(fallbackLocation?.id ?? '');
  };

  const addRouteSet = () => {
    if (!selectedZone || zoneLocations.length === 0) return;
    const nextRouteSet = createRouteSet(selectedZone.id, routeSets.length, [zoneLocations[0].id]);
    updateZone(selectedZone.id, (zone) => ({
      ...zone,
      routeSets: [...getZoneRouteSets(zone), nextRouteSet],
    }));
    setSelectedRouteSetId(nextRouteSet.id);
  };

  const updateSelectedRouteSet = (patch: Partial<ZoneRouteSet>) => {
    if (!selectedZone || !selectedRouteSet) return;
    updateZone(selectedZone.id, (zone) => ({
      ...zone,
      routeSets: getZoneRouteSets(zone).map((routeSet) => (routeSet.id === selectedRouteSet.id ? { ...routeSet, ...patch } : routeSet)),
    }));
  };

  const toggleLocationInRouteSet = (routeSetId: string, locationId: string) => {
    if (!selectedZone) return;
    updateZone(selectedZone.id, (zone) => ({
      ...zone,
      routeSets: getZoneRouteSets(zone).map((routeSet) => {
        if (routeSet.id !== routeSetId) return routeSet;
        const hasLocation = routeSet.locationIds.includes(locationId);
        const nextIds = hasLocation
          ? routeSet.locationIds.filter((id) => id !== locationId)
          : [...routeSet.locationIds, locationId];
        return {
          ...routeSet,
          locationIds: nextIds.length > 0 ? nextIds : routeSet.locationIds,
        };
      }),
    }));
  };

  const deleteSelectedRouteSet = () => {
    if (!selectedZone || !selectedRouteSet) return;
    const nextRouteSets = routeSets.filter((routeSet) => routeSet.id !== selectedRouteSet.id);
    updateZone(selectedZone.id, (zone) => ({
      ...zone,
      routeSets: nextRouteSets.length > 0 ? nextRouteSets : [createRouteSet(zone.id, 0, zoneLocations.slice(0, 1).map((location) => location.id))],
    }));
    const fallbackRouteSet = nextRouteSets[0] ?? null;
    setSelectedRouteSetId(fallbackRouteSet?.id ?? '');
  };

  const save = async () => {
    if (!fileDataUrl) {
      setMessage('Upload the map image first.');
      return;
    }
    if (!name.trim()) {
      setMessage('Map set name is required.');
      return;
    }
    if (zones.length === 0) {
      setMessage('At least one zone is required.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        fileDataUrl,
        fileName,
        fileType,
        zones,
      });
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save this map set.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.9fr)]">
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {showNameField && (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Map set name"
              className="rounded-xl border border-white/15 bg-[#020611]/80 px-3 py-2.5 text-sm outline-none focus:border-orange-300"
            />
          )}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => void onUpload(event.target.files?.[0] ?? null)}
            className="rounded-xl border border-white/15 bg-[#020611]/80 px-3 py-2.5 text-sm"
          />
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[#020611]/76">
          {fileDataUrl ? (
            <>
              <div ref={containerRef} className="relative h-[24rem] w-full sm:h-[32rem]">
                {fileType === 'application/pdf' ? (
                  <embed src={fileDataUrl} type="application/pdf" className="h-full w-full" />
                ) : (
                  <img
                    ref={(img) => {
                      if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
                        onImageLoad(img);
                      }
                    }}
                    src={fileDataUrl}
                    onLoad={(event) => onImageLoad(event.currentTarget)}
                    className="h-full w-full object-contain"
                  />
                )}
              {zones.map((zone, index) => {
                const markerLeft = `${frame.left + (zone.x / 100) * frame.width}%`;
                const markerTop = `${frame.top + (zone.y / 100) * frame.height}%`;
                const safeRadiusX = radiusToPercent(zone.radiusX ?? zone.radius);
                const safeRadiusY = zone.shape === 'oval' ? radiusToPercent(zone.radiusY ?? zone.radius) : safeRadiusX;
                const mediaWidthPx = (containerSize.width * frame.width) / 100;
                const mediaHeightPx = (containerSize.height * frame.height) / 100;
                const circleBasePx = Math.min(mediaWidthPx, mediaHeightPx);
                const width = zone.shape === 'oval'
                  ? (mediaWidthPx * safeRadiusX * 2) / 100
                  : (circleBasePx * safeRadiusX * 2) / 100;
                const height = zone.shape === 'oval'
                  ? (mediaHeightPx * safeRadiusY * 2) / 100
                  : (circleBasePx * safeRadiusX * 2) / 100;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onPointerDown={(event) => startDrag(zone.id, event)}
                    onClick={() => {
                      setSelectedZoneId(zone.id);
                      setSelectedLocationId(getZoneLocations(zone)[0]?.id ?? '');
                      setSelectedRouteSetId(getZoneRouteSets(zone)[0]?.id ?? '');
                    }}
                    className="absolute z-20 touch-none"
                    style={{
                      left: markerLeft,
                      top: markerTop,
                      width: `${width}px`,
                      height: `${height}px`,
                      transform: `translate(-50%, -50%) rotate(${zone.rotation ?? 0}deg)`,
                    }}
                  >
                    <ZoneCircle
                      color={zone.color}
                      selected={zone.id === selectedZoneId}
                      label={String(index + 1)}
                      anchored={false}
                      className="h-full w-full"
                    />
                  </button>
                );
              })}
              </div>
            </>
          ) : (
            <div className="grid h-[24rem] place-items-center text-sm text-white/44 sm:h-[32rem]">
              Upload the map first, then place zones.
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <BreathButton onClick={() => addZone('circle')} className="text-xs">ADD CIRCLE ZONE</BreathButton>
          <BreathButton onClick={() => addZone('oval')} className="text-xs">ADD OVAL ZONE</BreathButton>
          <BreathButton onClick={deleteSelectedZone} className="text-xs">DELETE ZONE</BreathButton>
        </div>
      </div>

      <div className="space-y-3 rounded-[24px] border border-white/12 bg-[#09142a]/70 p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/72">Zones</p>
            <div className="mt-3 flex flex-wrap gap-2">
            {zones.map((zone, index) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => {
                  setSelectedZoneId(zone.id);
                  setSelectedLocationId(getZoneLocations(zone)[0]?.id ?? '');
                  setSelectedRouteSetId(getZoneRouteSets(zone)[0]?.id ?? '');
                }}
                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] ${
                  zone.id === selectedZoneId
                    ? 'border-orange-300/50 bg-orange-500/12 text-orange-100'
                    : 'border-white/10 bg-white/[0.03] text-white/56'
                }`}
              >
                {index + 1}. {zone.name}
              </button>
            ))}
            </div>
          </div>

          {selectedZone ? (
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/72">Zone Geometry</p>
              <input
                value={selectedZone.name}
                onChange={(event) => updateSelectedZone({ name: event.target.value })}
                placeholder="Zone name"
                className="w-full rounded-xl border border-white/12 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateSelectedZone({ shape: 'circle', radiusY: selectedZone.radiusX ?? selectedZone.radius })} className={`rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.16em] ${selectedZone.shape !== 'oval' ? 'border-orange-300/45 bg-orange-500/12 text-orange-100' : 'border-white/10 bg-white/[0.03] text-white/62'}`}>Circle</button>
                <button type="button" onClick={() => updateSelectedZone({ shape: 'oval' })} className={`rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.16em] ${selectedZone.shape === 'oval' ? 'border-orange-300/45 bg-orange-500/12 text-orange-100' : 'border-white/10 bg-white/[0.03] text-white/62'}`}>Oval</button>
              </div>
              {selectedZone.shape === 'oval' ? (
                <>
                  <label className="block text-xs text-white/68">
                    Radius X
                    <input type="range" min={2} max={18} step={0.2} value={radiusToPercent(selectedZone.radiusX ?? selectedZone.radius)} onChange={(event) => updateSelectedZone({ radiusX: percentToRadius(Number(event.target.value)) })} className="mt-1 w-full" />
                  </label>
                  <label className="block text-xs text-white/68">
                    Radius Y
                    <input type="range" min={2} max={18} step={0.2} value={radiusToPercent(selectedZone.radiusY ?? selectedZone.radius)} onChange={(event) => updateSelectedZone({ radiusY: percentToRadius(Number(event.target.value)) })} className="mt-1 w-full" />
                  </label>
                  <label className="block text-xs text-white/68">
                    Rotation
                    <input type="range" min={-90} max={90} step={1} value={selectedZone.rotation ?? 0} onChange={(event) => updateSelectedZone({ rotation: Number(event.target.value) })} className="mt-1 w-full" />
                  </label>
                </>
              ) : (
                <label className="block text-xs text-white/68">
                  Radius
                  <input type="range" min={2} max={18} step={0.2} value={radiusToPercent(selectedZone.radiusX ?? selectedZone.radius)} onChange={(event) => updateSelectedZone({ radiusX: percentToRadius(Number(event.target.value)), radiusY: percentToRadius(Number(event.target.value)) })} className="mt-1 w-full" />
                </label>
              )}
            </div>
          ) : (
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
              Add a zone to begin defining its geometry.
            </div>
          )}
        </div>

        {selectedZone ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/72">Location Entries</p>
                <BreathButton onClick={addLocation} className="px-3 py-1.5 text-[10px]">ADD ENTRY</BreathButton>
              </div>
              <div className="grid gap-2">
                {zoneLocations.map((location, index) => (
                  <div
                    key={location.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                      location.id === selectedLocation?.id
                        ? 'border-orange-300/45 bg-orange-500/12 text-orange-100'
                        : 'border-white/10 bg-white/[0.03] text-white/70'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedLocationId(location.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">Entry {index + 1}</p>
                      <p className="truncate text-sm font-semibold">{location.name}</p>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteLocation(location.id);
                      }}
                      className="rounded-lg border border-white/10 bg-[#020611]/72 p-2 text-white/56 transition hover:border-orange-300/35 hover:text-orange-100"
                      aria-label={`Delete ${location.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/72">Location Detail</p>
                {selectedLocation && <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/48">Selected</div>}
              </div>
              {selectedLocation ? (
                <div className="grid gap-2">
                  <input value={selectedLocation.name} onChange={(event) => updateSelectedLocation({ name: event.target.value })} placeholder="Location label" className="rounded-xl border border-white/12 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300" />
                  <input value={selectedLocation.locationCode} onChange={(event) => updateSelectedLocation({ locationCode: event.target.value })} placeholder="QR location code" className="rounded-xl border border-white/12 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300" />
                  <textarea value={selectedLocation.description} onChange={(event) => updateSelectedLocation({ description: event.target.value })} placeholder="Location description shown to admins and scan-side details" rows={3} className="rounded-xl border border-white/12 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300" />
                  <textarea value={selectedLocation.riddle} onChange={(event) => updateSelectedLocation({ riddle: event.target.value })} placeholder="Riddle for this location entry" rows={4} className="rounded-xl border border-white/12 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300" />
                </div>
              ) : (
                <p className="text-sm text-white/50">Select a location entry to edit its code, description, and riddle.</p>
              )}
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/72">Route Sets</p>
                <BreathButton onClick={addRouteSet} className="px-3 py-1.5 text-[10px]">ADD SET</BreathButton>
              </div>
              <div className="flex flex-wrap gap-2">
                {routeSets.map((routeSet) => (
                  <button
                    key={routeSet.id}
                    type="button"
                    onClick={() => setSelectedRouteSetId(routeSet.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.14em] ${
                      routeSet.id === selectedRouteSet?.id
                        ? 'border-orange-300/45 bg-orange-500/12 text-orange-100'
                        : 'border-white/10 bg-white/[0.03] text-white/56'
                    }`}
                  >
                    {routeSet.name}
                  </button>
                ))}
              </div>
              {selectedRouteSet ? (
                <div className="grid gap-2">
                  <input value={selectedRouteSet.name} onChange={(event) => updateSelectedRouteSet({ name: event.target.value })} placeholder="Set label" className="rounded-xl border border-white/12 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300" />
                  <div className="flex flex-wrap gap-2">
                    {zoneLocations.map((location) => {
                      const active = selectedRouteSet.locationIds.includes(location.id);
                      return (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => toggleLocationInRouteSet(selectedRouteSet.id, location.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs tracking-[0.08em] ${
                            active
                              ? 'border-emerald-300/45 bg-emerald-500/12 text-emerald-100'
                              : 'border-white/10 bg-white/[0.03] text-white/56'
                          }`}
                        >
                          {location.name}
                        </button>
                      );
                    })}
                  </div>
                  <BreathButton onClick={deleteSelectedRouteSet} className="text-xs">DELETE SET</BreathButton>
                </div>
              ) : (
                <p className="text-sm text-white/50">Each set is a valid randomized combination for this zone.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
            Add a zone to begin defining its locations and route sets.
          </div>
        )}

        {message && <p className="text-sm text-white/76">{message}</p>}

        <div className="flex flex-wrap gap-2">
          {onCancel && <BreathButton onClick={onCancel} className="text-xs">CANCEL</BreathButton>}
          <BreathButton onClick={() => void save()} className="text-xs">{saving ? 'SAVING...' : saveLabel}</BreathButton>
        </div>
      </div>
    </div>
  );
}
