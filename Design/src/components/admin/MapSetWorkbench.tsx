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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.14fr)_minmax(400px,0.96fr)]">
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

        <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,31,0.9),rgba(2,6,17,0.96))] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
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
          <BreathButton onClick={() => addZone('circle')} className="text-xs">ADD CIRCLE</BreathButton>
          <BreathButton onClick={() => addZone('oval')} className="text-xs">ADD OVAL</BreathButton>
          <BreathButton onClick={deleteSelectedZone} className="text-xs">DELETE ZONE</BreathButton>
        </div>
      </div>

      <div className="space-y-3 rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(9,20,42,0.82),rgba(4,8,18,0.96))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
        <div className="flex items-start justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/72">Code Studio</p>
            <h3 className="mt-1 font-display text-[1.1rem] font-semibold tracking-[-0.04em] text-white">Location composer</h3>
          </div>
          <div className="rounded-full border border-white/10 bg-[#020611]/56 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/46">
            {selectedZone ? `${zoneLocations.length} entries / ${routeSets.length} sets` : 'select zone'}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/72">Zones</p>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/34">pick one</span>
            </div>
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
                className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em] transition ${
                  zone.id === selectedZoneId
                    ? 'border-orange-300/50 bg-orange-500/12 text-orange-100 shadow-[0_0_18px_rgba(245,130,32,0.1)]'
                    : 'border-white/10 bg-[#020611]/48 text-white/56 hover:border-white/18'
                }`}
              >
                {index + 1}. {zone.name}
              </button>
            ))}
            </div>
          </div>

          {selectedZone ? (
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3.5 space-y-3">
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
          <div className="space-y-3">
            <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/72">Location Codes</p>
                  <p className="mt-1 text-sm text-white/42">Build the QR entries for this zone here.</p>
                </div>
                <BreathButton onClick={addLocation} className="px-3 py-1.5 text-[10px]">ADD ENTRY</BreathButton>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)]">
                <div className="rounded-[18px] border border-white/10 bg-[#020611]/60 p-2">
                  <div className="space-y-2">
                    {zoneLocations.map((location, index) => (
                      <div
                        key={location.id}
                        className={`rounded-[18px] border transition ${
                          location.id === selectedLocation?.id
                            ? 'border-orange-300/45 bg-orange-500/10 shadow-[0_0_18px_rgba(245,130,32,0.08)]'
                            : 'border-white/10 bg-white/[0.025] hover:border-white/16'
                        }`}
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedLocationId(location.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Entry {index + 1}</p>
                            <p className="mt-1 truncate text-sm font-semibold text-white">{location.name}</p>
                            <p className="mt-1 truncate text-[11px] text-white/40">{location.locationCode || 'Code pending'}</p>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteLocation(location.id);
                            }}
                            className="rounded-xl border border-white/10 bg-[#020611]/72 p-2 text-white/48 transition hover:border-orange-300/35 hover:text-orange-100"
                            aria-label={`Delete ${location.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-[#020611]/56 p-4">
                  {selectedLocation ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/34">Active entry</p>
                          <h4 className="mt-1 font-display text-lg font-semibold text-white">{selectedLocation.name || 'Unnamed location'}</h4>
                        </div>
                        <div className="rounded-full border border-orange-300/18 bg-orange-500/8 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-orange-100/82">
                          {selectedZone.name}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
                          Label
                          <input value={selectedLocation.name} onChange={(event) => updateSelectedLocation({ name: event.target.value })} placeholder="Bookshelf east" className="rounded-2xl border border-white/12 bg-[#020611]/84 px-3.5 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-orange-300/55" />
                        </label>
                        <label className="grid gap-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
                          QR code
                          <input value={selectedLocation.locationCode} onChange={(event) => updateSelectedLocation({ locationCode: event.target.value })} placeholder="ZONE-A-03" className="rounded-2xl border border-white/12 bg-[#020611]/84 px-3.5 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-orange-300/55" />
                        </label>
                      </div>

                      <label className="grid gap-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
                        Location detail
                        <textarea value={selectedLocation.description} onChange={(event) => updateSelectedLocation({ description: event.target.value })} placeholder="What the admin and scan side should know." rows={3} className="rounded-2xl border border-white/12 bg-[#020611]/84 px-3.5 py-3 text-sm normal-case tracking-normal text-white outline-none transition focus:border-orange-300/55" />
                      </label>

                      <label className="grid gap-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
                        Riddle
                        <textarea value={selectedLocation.riddle} onChange={(event) => updateSelectedLocation({ riddle: event.target.value })} placeholder="Write the clue hunters will see." rows={5} className="rounded-2xl border border-white/12 bg-[#020611]/84 px-3.5 py-3 text-sm normal-case tracking-normal text-white outline-none transition focus:border-orange-300/55" />
                      </label>
                    </div>
                  ) : (
                    <div className="grid min-h-[15rem] place-items-center rounded-[18px] border border-dashed border-white/10 bg-[#020611]/44 text-sm text-white/40">
                      Select a location entry to edit it.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/72">Route Sets</p>
                  <p className="mt-1 text-sm text-white/42">Each set is a valid randomized combination for this zone.</p>
                </div>
                <BreathButton onClick={addRouteSet} className="px-3 py-1.5 text-[10px]">ADD SET</BreathButton>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(180px,0.62fr)_minmax(0,1.38fr)]">
                <div className="space-y-2">
                  {routeSets.map((routeSet) => (
                    <button
                      key={routeSet.id}
                      type="button"
                      onClick={() => setSelectedRouteSetId(routeSet.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                        routeSet.id === selectedRouteSet?.id
                          ? 'border-orange-300/45 bg-orange-500/12 text-orange-100'
                          : 'border-white/10 bg-[#020611]/48 text-white/56 hover:border-white/18'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/34">Set</div>
                      <div className="mt-1 text-sm font-semibold">{routeSet.name}</div>
                    </button>
                  ))}
                </div>

                {selectedRouteSet ? (
                  <div className="rounded-[18px] border border-white/10 bg-[#020611]/56 p-4">
                    <div className="grid gap-3">
                      <input value={selectedRouteSet.name} onChange={(event) => updateSelectedRouteSet({ name: event.target.value })} placeholder="Set label" className="rounded-2xl border border-white/12 bg-[#020611]/84 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-orange-300/55" />
                      <div className="flex flex-wrap gap-2">
                        {zoneLocations.map((location) => {
                          const active = selectedRouteSet.locationIds.includes(location.id);
                          return (
                            <button
                              key={location.id}
                              type="button"
                              onClick={() => toggleLocationInRouteSet(selectedRouteSet.id, location.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs tracking-[0.08em] transition ${
                                active
                                  ? 'border-emerald-300/45 bg-emerald-500/12 text-emerald-100'
                                  : 'border-white/10 bg-white/[0.03] text-white/56 hover:border-white/18'
                              }`}
                            >
                              {location.name}
                            </button>
                          );
                        })}
                      </div>
                      <div className="pt-1">
                        <BreathButton onClick={deleteSelectedRouteSet} className="text-xs">DELETE SET</BreathButton>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-[10rem] place-items-center rounded-[18px] border border-dashed border-white/10 bg-[#020611]/44 text-sm text-white/40">
                    Add a route set to continue.
                  </div>
                )}
              </div>
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
