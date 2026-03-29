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
  const { containerRef, frame, onImageLoad } = useContainedMediaFrame();
  const safeZones = useMemo(() => map.zones.map((zone) => normalizeZone(zone)), [map.zones]);

  return (
    <>
      <button
        type="button"
        onClick={() => expandOnClick && setIsOpen(true)}
        className={`relative block w-full overflow-hidden rounded border border-white/10 bg-[#01040c] ${heightClassName}`}
      >
      <div ref={containerRef} className="relative h-full w-full">
        {map.fileType === 'application/pdf' ? (
          <embed src={map.fileDataUrl} type="application/pdf" className="h-full w-full" />
        ) : (
          <img src={map.fileDataUrl} onLoad={(e) => onImageLoad(e.currentTarget)} className="h-full w-full object-contain" />
        )}
      {showZones && safeZones.map((safeZone: Zone, index) => {
        const markerLeft = `${frame.left + (safeZone.x / 100) * frame.width}%`;
        const markerTop = `${frame.top + (safeZone.y / 100) * frame.height}%`;
        return (
          <div key={safeZone.id} className="contents">
            <ZoneCircle
              style={{
                left: markerLeft,
                top: markerTop,
                width: `${(radiusToPercent(safeZone.radius) * 2 / 100) * frame.width}%`,
                minWidth: 34,
                minHeight: 34,
              }}
              color={safeZone.color}
              label={String(index + 1)}
              className="pointer-events-none absolute z-20"
            />
          </div>
        );
      })}
      </div>
      </button>
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
