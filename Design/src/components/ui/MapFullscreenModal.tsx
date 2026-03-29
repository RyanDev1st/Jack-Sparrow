'use client';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useMemo, useState } from 'react';
import type { Zone } from '../../lib/mapSetApi';
import { useContainedMediaFrame } from '../../hooks/useContainedMediaFrame';
import { radiusToPercent } from '../../lib/zoneGeometry';
import { normalizeZone } from '../../lib/zoneGeometry';
import ZoneCircle from './ZoneCircle';

type MapFullscreenModalProps = {
  isOpen: boolean;
  onClose: () => void;
  fileType: string;
  fileDataUrl: string;
  zones?: Zone[];
  actionLabel?: string;
  onAction?: () => void;
};

export default function MapFullscreenModal({ isOpen, onClose, fileType, fileDataUrl, zones = [], actionLabel, onAction }: MapFullscreenModalProps) {
  const { containerRef, frame, containerSize, onImageLoad } = useContainedMediaFrame();
  const safeZones = useMemo(() => zones.map((zone) => normalizeZone(zone)), [zones]);
  const [hoveredZoneId, setHoveredZoneId] = useState('');
  const bindImage = (img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      onImageLoad(img);
    }
  };
  if (!isOpen) return null;

  const hoveredZone = safeZones.find((zone) => zone.id === hoveredZoneId) ?? null;

  const content = (
    <div className="fixed inset-0 z-50 bg-black/80 p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-w-7xl flex-col rounded-xl border border-white/20 bg-[#020611]">
        <div className="flex items-center justify-between border-b border-white/12 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Expanded Map View</p>
          <div className="flex items-center gap-2">
            {actionLabel && onAction && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22, mass: 0.4 }}
                onClick={onAction}
                className="rounded-lg border border-white/20 bg-[#f58220]/85 px-3 py-1.5 text-sm font-semibold text-[#180900]"
              >
                {actionLabel}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 22, mass: 0.4 }}
              onClick={onClose}
              className="rounded-lg border border-white/20 bg-[#0a1630] px-3 py-1.5 text-sm text-white"
            >
              CLOSE
            </motion.button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1 p-2 sm:p-4">
          <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-lg border border-white/10 bg-[#01040c]">
            {fileType === 'application/pdf' ? (
              <embed src={fileDataUrl} type="application/pdf" className="h-full w-full" />
            ) : (
              <img ref={bindImage} src={fileDataUrl} onLoad={(e) => onImageLoad(e.currentTarget)} className="h-full w-full object-contain" />
            )}
            {safeZones.map((zone, index) => {
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
                  onMouseEnter={() => setHoveredZoneId(zone.id)}
                  onMouseLeave={() => setHoveredZoneId((prev) => (prev === zone.id ? '' : prev))}
                  onFocus={() => setHoveredZoneId(zone.id)}
                  onBlur={() => setHoveredZoneId((prev) => (prev === zone.id ? '' : prev))}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${frame.left + (zone.x / 100) * frame.width}%`,
                    top: `${frame.top + (zone.y / 100) * frame.height}%`,
                    width: `${width}px`,
                    height: `${height}px`,
                    minWidth: 34,
                    minHeight: 34,
                    transform: `translate(-50%, -50%) rotate(${zone.rotation ?? 0}deg)`,
                  }}
                >
                  <ZoneCircle
                    color={zone.color}
                    label={String(index + 1)}
                    selected={hoveredZoneId === zone.id}
                    anchored={false}
                    className="h-full w-full"
                  />
                </button>
              );
            })}

            {hoveredZone && (
              <div
                className="pointer-events-none absolute z-30 max-w-[min(320px,75vw)] -translate-x-1/2 rounded-lg border border-orange-300/45 bg-[#061127]/92 px-3 py-2 text-left shadow-[0_0_22px_rgba(245,130,32,0.28)]"
                style={{
                  left: `${frame.left + (hoveredZone.x / 100) * frame.width}%`,
                  top: `${Math.max(5, frame.top + (hoveredZone.y / 100) * frame.height - 8)}%`,
                }}
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-orange-200">{hoveredZone.name?.trim() || 'Unnamed Location'}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/85">
                  {(hoveredZone.locations?.length ?? 0) > 0 ? `${hoveredZone.locations?.length} location entries configured` : hoveredZone.riddle?.trim() || 'No location entries configured yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
