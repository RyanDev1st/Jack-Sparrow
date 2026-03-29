'use client';

import { motion } from 'framer-motion';
import type { Zone } from '../../lib/mapSetApi';

type ScanFeedbackModalProps = {
  isVisible: boolean;
  scannedZone: Zone | null;
  isCorrect: boolean;
  message: string;
  onClose: () => void;
};

export default function ScanFeedbackModal({
  isVisible,
  scannedZone,
  isCorrect,
  message,
  onClose,
}: ScanFeedbackModalProps) {
  if (!isVisible || !scannedZone) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto rounded-2xl border border-white/20 bg-[#050d1d]/95 p-8 text-center shadow-2xl"
      >
        {isCorrect ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 15 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-400/80 bg-green-900/40 text-3xl font-bold text-green-300"
            >
              ✓
            </motion.div>
            <h2 className="text-2xl font-bold text-green-300">LOCATION FOUND!</h2>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 15 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-400/80 bg-red-900/40 text-3xl font-bold text-red-300"
            >
              ✗
            </motion.div>
            <h2 className="text-2xl font-bold text-red-300">NOT THIS LOCATION</h2>
          </>
        )}

        <div className="mt-3 rounded-lg border" style={{ borderColor: `${scannedZone.color}40` }}>
          <p className="px-4 py-3 text-sm font-semibold" style={{ color: scannedZone.color }}>
            {scannedZone.name || scannedZone.locationCode}
          </p>
        </div>

        <p className="mt-4 text-sm text-white/75">{message}</p>

        <button
          onClick={onClose}
          className="mt-6 rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-sm font-semibold text-white/90 hover:bg-white/20"
        >
          CONTINUE
        </button>
      </motion.div>
    </motion.div>
  );
}
