'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { MapSet, Zone } from '../../lib/mapSetApi';
import { useContainedMediaFrame } from '../../hooks/useContainedMediaFrame';
import { clampPercent, normalizeZone, percentToRadius, radiusToPercent } from '../../lib/zoneGeometry';
import { ensureDistinctZoneColors, normalizeZoneColors } from '../../lib/zoneColor';
import ZoneCircle from '../ui/ZoneCircle';

type MapSetEditorModalProps = {
  mapSet: MapSet | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (next: { zones: Zone[]; fileDataUrl: string; fileName: string; fileType: string }) => Promise<void>;
};

export default function MapSetEditorModal({ mapSet, isOpen, onClose, onSave }: MapSetEditorModalProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { containerRef, frame, onImageLoad } = useContainedMediaFrame();

  useEffect(() => {
    if (!isOpen || !mapSet) return;
    const normalizedZones = mapSet.zones.map((zone) => normalizeZone(zone));
    const colors = normalizeZoneColors(normalizedZones.map((zone) => zone.color));
    setZones(normalizedZones.map((zone, index) => ({ ...zone, color: colors[index] })));
    setFileDataUrl(mapSet.fileDataUrl);
    setFileName(mapSet.fileName);
    setFileType(mapSet.fileType);
    setSelectedId(normalizedZones[0]?.id ?? '');
  }, [isOpen, mapSet]);

  const selected = zones.find((z) => z.id === selectedId) ?? null;

  if (!isOpen || !mapSet) return null;

  const updateZone = (id: string, patch: Partial<Zone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  };

  const startDrag = (zoneId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    event.preventDefault();
    setSelectedId(zoneId);

    const move = (ev: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const canvasX = ((ev.clientX - rect.left) / rect.width) * 100;
      const canvasY = ((ev.clientY - rect.top) / rect.height) * 100;
      const x = clampPercent(((canvasX - frame.left) / Math.max(frame.width, 0.001)) * 100);
      const y = clampPercent(((canvasY - frame.top) / Math.max(frame.height, 0.001)) * 100);
      updateZone(zoneId, { x, y });
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onSaveTap = async () => {
    setSaving(true);
    try {
      await onSave({
        zones: zones.map((zone) => ({ ...zone, radius: percentToRadius(radiusToPercent(zone.radius)) })),
        fileDataUrl,
        fileName,
        fileType,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addZone = () => {
    const nextColors = ensureDistinctZoneColors(zones.length + 1);
    const id = `zone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const next: Zone = {
      id,
      x: 50,
      y: 50,
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

  const deleteSelectedZone = () => {
    if (!selectedId) return;
    setZones((prev) => {
      const kept = prev.filter((zone) => zone.id !== selectedId);
      const colors = normalizeZoneColors(kept.map((zone) => zone.color));
      return kept.map((zone, index) => ({ ...zone, color: colors[index] }));
    });
    setSelectedId((prev) => {
      const next = zones.find((zone) => zone.id !== prev);
      return next?.id ?? '';
    });
  };

  const onReplaceImage = async (file: File | null) => {
    if (!file) return;
    const isAllowed = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isAllowed) return;
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
    setFileDataUrl(dataUrl);
    setFileName(file.name);
    setFileType(file.type);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 p-2 sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-w-7xl flex-col rounded-xl border border-white/20 bg-[#020611]">
        <div className="flex items-center justify-between border-b border-white/12 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Edit Map Locations</p>
          <motion.button whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 350, damping: 22, mass: 0.4 }} onClick={onClose} className="rounded-lg border border-white/20 bg-[#0a1630] px-3 py-1.5 text-sm text-white">
            CLOSE
          </motion.button>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[1fr_300px]">
          <div ref={stageRef} className="relative min-h-[260px] overflow-hidden rounded-lg border border-white/12 bg-[#01040c]">
            <div ref={containerRef} className="absolute inset-0">
            {fileDataUrl && (
              fileType === 'application/pdf' ? (
                <embed src={fileDataUrl} type="application/pdf" className="h-full w-full" />
              ) : (
                <img src={fileDataUrl} onLoad={(e) => onImageLoad(e.currentTarget)} className="h-full w-full object-contain" />
              )
            )}
            </div>
            {zones.map((zone) => {
              const safeZone = normalizeZone(zone);
              const r = radiusToPercent(safeZone.radius);
              const diameter = (r * 2 / 100) * frame.width;
              return (
                <button
                  key={safeZone.id}
                  onPointerDown={(e) => startDrag(safeZone.id, e)}
                  onClick={() => setSelectedId(safeZone.id)}
                  style={{
                    left: `${frame.left + (safeZone.x / 100) * frame.width}%`,
                    top: `${frame.top + (safeZone.y / 100) * frame.height}%`,
                    width: `${diameter}%`,
                  }}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-none"
                >
                  <ZoneCircle
                    color={safeZone.color}
                    selected={selectedId === safeZone.id}
                    className="h-full w-full"
                    label={String(zones.findIndex((entry) => entry.id === safeZone.id) + 1)}
                  />
                </button>
              );
            })}
          </div>

          <div className="space-y-3 rounded-lg border border-white/12 bg-[#09142a]/75 p-3">
            <input type="file" accept="image/*,application/pdf" onChange={(e) => void onReplaceImage(e.target.files?.[0] ?? null)} className="w-full rounded border border-white/15 bg-[#020611]/80 px-2 py-1.5 text-xs" />
            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 350, damping: 22, mass: 0.4 }} onClick={addZone} className="w-full rounded-lg border border-white/20 bg-[#09142a] px-2 py-1.5 text-xs text-white/90">
              ADD LOCATION
            </motion.button>
            {selected ? (
              <>
                <p className="text-xs uppercase tracking-[0.18em] text-orange-200">Selected Location</p>
                <input value={selected.name} onChange={(e) => updateZone(selected.id, { name: e.target.value })} className="w-full rounded border border-white/15 bg-[#020611]/80 px-2 py-1.5 text-sm" placeholder="Location label" />
                <input value={selected.locationCode} onChange={(e) => updateZone(selected.id, { locationCode: e.target.value })} className="w-full rounded border border-white/15 bg-[#020611]/80 px-2 py-1.5 text-sm" placeholder="Location code" />
                <textarea value={selected.riddle} onChange={(e) => updateZone(selected.id, { riddle: e.target.value })} className="w-full rounded border border-white/15 bg-[#020611]/80 px-2 py-1.5 text-sm" rows={3} placeholder="Riddle / Puzzle" />
                <label className="block text-xs text-white/70">Radius (%)
                  <input type="range" min={1} max={16} step={0.2} value={radiusToPercent(selected.radius)} onChange={(e) => updateZone(selected.id, { radius: percentToRadius(Number(e.target.value)) })} className="w-full" />
                </label>
                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 350, damping: 22, mass: 0.4 }} onClick={deleteSelectedZone} className="w-full rounded-lg border border-orange-300/35 bg-[#2a1306] px-2 py-1.5 text-xs text-orange-100">
                  DELETE LOCATION
                </motion.button>
              </>
            ) : (
              <p className="text-sm text-white/70">Select a location circle to edit details.</p>
            )}

            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 350, damping: 22, mass: 0.4 }} onClick={() => void onSaveTap()} disabled={saving} className="w-full rounded-lg border border-white/20 bg-[#f58220]/85 px-3 py-2 text-sm font-semibold text-[#1a0b00]">
              {saving ? 'SAVING...' : 'SAVE LOCATION UPDATES'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
