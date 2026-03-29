'use client';

import { motion } from 'framer-motion';
import type { MapSet, Zone } from '../../lib/mapSetApi';
import MapSetWorkbench from './MapSetWorkbench';

type MapSetEditorModalProps = {
  mapSet: MapSet | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (next: { zones: Zone[]; fileDataUrl: string; fileName: string; fileType: string }) => Promise<void>;
};

export default function MapSetEditorModal({ mapSet, isOpen, onClose, onSave }: MapSetEditorModalProps) {
  if (!isOpen || !mapSet) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 p-2 sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-w-[92rem] flex-col rounded-[26px] border border-white/20 bg-[#020611]">
        <div className="flex items-center justify-between border-b border-white/12 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Edit Map Set</p>
            <p className="mt-1 text-sm text-white/46">{mapSet.name}</p>
          </div>
          <motion.button whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 350, damping: 22, mass: 0.4 }} onClick={onClose} className="rounded-lg border border-white/20 bg-[#0a1630] px-3 py-1.5 text-sm text-white">
            CLOSE
          </motion.button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <MapSetWorkbench
            initialName={mapSet.name}
            initialFileDataUrl={mapSet.fileDataUrl}
            initialFileName={mapSet.fileName}
            initialFileType={mapSet.fileType}
            initialZones={mapSet.zones}
            saveLabel="SAVE UPDATES"
            showNameField={false}
            onCancel={onClose}
            onSave={async (next) => {
              await onSave({
                zones: next.zones,
                fileDataUrl: next.fileDataUrl,
                fileName: next.fileName,
                fileType: next.fileType,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
