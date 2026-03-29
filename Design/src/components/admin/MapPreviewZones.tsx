import { useMemo, useState } from 'react';
import type { MapSet, Zone } from '../../lib/mapSetApi';
import { useContainedMediaFrame } from '../../hooks/useContainedMediaFrame';
import { radiusToPercent } from '../../lib/zoneGeometry';
import { normalizeZone } from '../../lib/zoneGeometry';
import MapFullscreenModal from '../ui/MapFullscreenModal';
import ZoneCircle from '../ui/ZoneCircle';

type MapPreviewZonesProps = {
  map: Pick<MapSet, 'fileType' | 'fileDataUrl' | 'zones'>;
  heightClassName: string;
  showZones?: boolean;
  expandOnClick?: boolean;
  fullscreenActionLabel?: string;
  onFullscreenAction?: () => void;
};

export default function MapPreviewZones({
  map,
  heightClassName,
  showZones = true,
  expandOnClick = true,
  fullscreenActionLabel,
  onFullscreenAction,
}: MapPreviewZonesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { containerRef, frame, containerSize, onImageLoad } = useContainedMediaFrame();
  const safeZones = useMemo(() => map.zones.map((zone) => normalizeZone(zone)), [map.zones]);
  const bindImage = (img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      onImageLoad(img);
    }
  };

  return (
    <>
      <div className={`relative w-full overflow-hidden rounded border border-white/10 bg-[#01040c] ${heightClassName}`}>
        <div ref={containerRef} className="relative h-full w-full">
          {map.fileType === 'application/pdf' ? (
            <embed src={map.fileDataUrl} type="application/pdf" className="h-full w-full" />
          ) : (
            <img ref={bindImage} src={map.fileDataUrl} onLoad={(e) => onImageLoad(e.currentTarget)} className="h-full w-full object-contain" />
          )}
          {showZones && safeZones.map((safeZone: Zone, index) => {
            const markerLeft = `${frame.left + (safeZone.x / 100) * frame.width}%`;
            const markerTop = `${frame.top + (safeZone.y / 100) * frame.height}%`;
            const safeRadiusX = radiusToPercent(safeZone.radiusX ?? safeZone.radius);
            const safeRadiusY = safeZone.shape === 'oval' ? radiusToPercent(safeZone.radiusY ?? safeZone.radius) : safeRadiusX;
            const mediaWidthPx = (containerSize.width * frame.width) / 100;
            const mediaHeightPx = (containerSize.height * frame.height) / 100;
            const circleBasePx = Math.min(mediaWidthPx, mediaHeightPx);
            const widthPx = safeZone.shape === 'oval'
              ? (mediaWidthPx * safeRadiusX * 2) / 100
              : (circleBasePx * safeRadiusX * 2) / 100;
            const heightPx = safeZone.shape === 'oval'
              ? (mediaHeightPx * safeRadiusY * 2) / 100
              : (circleBasePx * safeRadiusX * 2) / 100;
            return (
              <div key={safeZone.id} className="contents">
                <ZoneCircle
                  style={{
                    left: markerLeft,
                    top: markerTop,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                    minWidth: 34,
                    minHeight: 34,
                    transform: `translate(-50%, -50%) rotate(${safeZone.rotation ?? 0}deg)`,
                  }}
                  color={safeZone.color}
                  label={String(index + 1)}
                  className="pointer-events-none absolute z-20"
                />
              </div>
            );
          })}
        </div>
        {expandOnClick && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="absolute bottom-3 right-3 z-30 rounded-full border border-white/12 bg-[#061127]/88 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition hover:border-orange-300/35 hover:text-orange-100"
          >
            Expand
          </button>
        )}
      </div>
      <MapFullscreenModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fileType={map.fileType}
        fileDataUrl={map.fileDataUrl}
        zones={showZones ? safeZones : []}
        actionLabel={fullscreenActionLabel}
        onAction={onFullscreenAction}
      />
    </>
  );
}
