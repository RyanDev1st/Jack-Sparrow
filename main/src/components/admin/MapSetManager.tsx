'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BreathButton from '../ui/BreathButton';
import GlassCard from '../ui/GlassCard';
import MapSetLibrary from './MapSetLibrary';
import MapPreviewZones from './MapPreviewZones';
import { listMapSetsApi, saveMapSetApi, type MapSet, type Zone } from '../../lib/mapSetApi';
import { percentToRadius, radiusToPercent } from '../../lib/zoneGeometry';
import { ensureDistinctZoneColors, normalizeZoneColors } from '../../lib/zoneColor';
import ZoneCircle from '../ui/ZoneCircle';

const MIN_ZONES = 2;
const MAX_ZONES = 3;

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

export default function MapSetManager() {
  const [name, setName] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileMeta, setFileMeta] = useState({ fileName: '', fileType: '' });
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [mapSets, setMapSets] = useState<MapSet[]>([]);
  const [message, setMessage] = useState('');
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selectedZone = useMemo(() => zones.find((z) => z.id === selectedId) ?? null, [zones, selectedId]);
  const reload = async () => setMapSets(await listMapSetsApi());

  useEffect(() => {
    void reload();
  }, []);

  const onUpload = async (file: File | null) => {
    if (!file) return;
    const isAllowed = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isAllowed) return setMessage('Only image or PDF is allowed.');
    setFileDataUrl(await toDataUrl(file));
    setFileMeta({ fileName: file.name, fileType: file.type });
  };

  const addZone = () => {
    if (zones.length >= MAX_ZONES) {
      setMessage(`This phase supports ${MIN_ZONES}-${MAX_ZONES} zones per map.`);
      return;
    }

    const nextColors = ensureDistinctZoneColors(zones.length + 1);
    const id = `zone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const next: Zone = {
      id,
      x: 45 + Math.random() * 10,
      y: 45 + Math.random() * 10,
      radius: 5.2,
      color: nextColors[zones.length],
      name: `Zone ${zones.length + 1}`,
      locationCode: '',
      riddle: '',
    };
    setZones((prev) => {
      const withNew = [...prev, next];
      const colors = normalizeZoneColors(withNew.map((zone) => zone.color));
      return withNew.map((zone, index) => ({ ...zone, color: colors[index] }));
    });
    setSelectedId(id);
  };

  const updateSelected = (patch: Partial<Zone>) => {
    setZones((prev) => prev.map((z) => (z.id === selectedId ? { ...z, ...patch } : z)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setZones((prev) => prev.filter((z) => z.id !== selectedId));
    setSelectedId((prev) => {
      const next = zones.find((zone) => zone.id !== prev);
      return next?.id ?? '';
    });
  };

  const startDrag = (zoneId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    setSelectedId(zoneId);

    const move = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      setZones((prev) =>
        prev.map((z) => (z.id === zoneId ? { ...z, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : z)),
      );
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const save = async () => {
    if (zones.length < MIN_ZONES || zones.length > MAX_ZONES) {
      setMessage(`Map must contain ${MIN_ZONES}-${MAX_ZONES} zones.`);
      return;
    }

    const result = await saveMapSetApi({ name, fileDataUrl, zones, ...fileMeta });
    setMessage(result.message);
    if (!result.ok) return;
    setName('');
    setFileDataUrl('');
    setFileMeta({ fileName: '', fileType: '' });
    setZones([]);
    setSelectedId('');
    await reload();
  };

  return (
    <GlassCard className="p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Map Sets</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Map Set Name" className="rounded-lg border border-white/15 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300" />
        <input type="file" accept="image/*,application/pdf" onChange={(e) => void onUpload(e.target.files?.[0] ?? null)} className="rounded-lg border border-white/15 bg-[#020611]/80 px-3 py-2 text-sm" />
      </div>

      {fileDataUrl && (
        <div ref={canvasRef} className="relative mt-3 h-72 overflow-hidden rounded-lg border border-white/15 bg-[#020611]/70">
          <MapPreviewZones
            map={{ fileType: fileMeta.fileType, fileDataUrl, zones }}
            heightClassName="h-full w-full rounded-none border-0"
            showZones={false}
            expandOnClick={false}
          />
          {zones.map((zone) => (
            <button
              key={zone.id}
              onPointerDown={(e) => startDrag(zone.id, e)}
              onClick={() => setSelectedId(zone.id)}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${radiusToPercent(zone.radius) * 2}%`,
                height: `${radiusToPercent(zone.radius) * 2}%`,
              }}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-none"
            >
              <ZoneCircle color={zone.color} selected={selectedId === zone.id} className="h-full w-full" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <BreathButton onClick={addZone} className="text-xs">ADD ZONE CIRCLE ({zones.length}/{MAX_ZONES})</BreathButton>
        <BreathButton onClick={deleteSelected} className="text-xs">DELETE SELECTED CIRCLE</BreathButton>
        <BreathButton onClick={save} className="text-xs">SAVE MAP SET</BreathButton>
      </div>

      {selectedZone && (
        <div className="mt-3 grid gap-2 rounded-lg border border-white/15 bg-[#020611]/70 p-3 sm:grid-cols-2">
          <input value={selectedZone.name} onChange={(e) => updateSelected({ name: e.target.value })} placeholder="Zone Name" className="rounded-lg border border-white/15 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300" />
          <input value={selectedZone.locationCode} onChange={(e) => updateSelected({ locationCode: e.target.value })} placeholder="Location Code" className="rounded-lg border border-white/15 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300" />
          <textarea value={selectedZone.riddle} onChange={(e) => updateSelected({ riddle: e.target.value })} placeholder="Riddle / Puzzle for this location" rows={3} className="sm:col-span-2 rounded-lg border border-white/15 bg-[#020611]/80 px-3 py-2 text-sm outline-none focus:border-orange-300" />
          <label className="text-xs text-white/75">Radius
            <input type="range" min={1} max={16} step={0.2} value={radiusToPercent(selectedZone.radius)} onChange={(e) => updateSelected({ radius: percentToRadius(Number(e.target.value)) })} className="w-full" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-white/75">X %
              <input type="number" min={0} max={100} value={selectedZone.x} onChange={(e) => updateSelected({ x: Number(e.target.value) })} className="w-full rounded bg-[#020611]/80 px-2 py-1" />
            </label>
            <label className="text-xs text-white/75">Y %
              <input type="number" min={0} max={100} value={selectedZone.y} onChange={(e) => updateSelected({ y: Number(e.target.value) })} className="w-full rounded bg-[#020611]/80 px-2 py-1" />
            </label>
          </div>
        </div>
      )}

      {message && <p className="mt-2 text-sm text-white/80">{message}</p>}
      <MapSetLibrary mapSets={mapSets} onMessage={setMessage} onReload={reload} />
    </GlassCard>
  );
}
