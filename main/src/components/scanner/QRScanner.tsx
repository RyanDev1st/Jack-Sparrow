'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef } from 'react';
import GlassCard from '../ui/GlassCard';
import { type ScannerPayloadOutcome, useScanner } from '../../hooks/useScanner';
import { SCANNER_CONFIG } from '../../lib/scannerConfig';

type QRScannerProps = {
  onPayload: (rawText: string) => Promise<boolean | void | ScannerPayloadOutcome> | boolean | void | ScannerPayloadOutcome;
  className?: string;
  fps?: number;
};

export default function QRScanner({ onPayload, className = '', fps = SCANNER_CONFIG.fps }: QRScannerProps) {
  const snapInputRef = useRef<HTMLInputElement | null>(null);
  const {
    videoRef,
    regionId,
    status,
    errorHint,
    activeCameraLabel,
    manualSnapVisible,
    isFinding,
    captureFps,
    decodeFps,
    scanFeedback,
    dismissScanFeedback,
    processManualSnapFile,
    pulseDuration,
    restartScanner,
  } = useScanner({ onPayload, fps });

  const active = status === 'scanning' || status === 'success';
  const scanSweepDuration = useMemo(() => {
    const effectiveRate = decodeFps > 0 ? decodeFps : Math.max(1, Math.round(captureFps * 0.45));
    return Math.max(0.45, Math.min(2.1, 2.2 - effectiveRate * 0.08));
  }, [decodeFps, captureFps]);

  const sweepGlowOpacity = useMemo(() => {
    const effectiveRate = decodeFps > 0 ? decodeFps : Math.max(1, Math.round(captureFps * 0.45));
    return Math.max(0.25, Math.min(0.85, 0.22 + effectiveRate * 0.03));
  }, [decodeFps, captureFps]);

  const speedLabel = useMemo(() => {
    const live = decodeFps > 0 ? decodeFps : captureFps;
    if (live >= 18) return 'FAST';
    if (live >= 12) return 'STABLE';
    return 'RECOVERING';
  }, [captureFps, decodeFps]);

  const liveSpeedDisplay = decodeFps > 0 ? decodeFps : captureFps > 0 ? captureFps : null;

  return (
    <motion.div className={`relative z-10 ${className}`}>
      <GlassCard className="relative overflow-hidden p-0">
        <div className="relative aspect-square w-full max-w-[min(92vw,34rem)] bg-[#020611]">
          <div
            id={regionId}
            className="relative z-[9999] h-full w-full"
          >
            <video
              ref={videoRef}
              muted
              playsInline
              className="relative z-[9999] h-full w-full object-cover transform-gpu [backface-visibility:hidden] will-change-transform"
            />
          </div>

          <AnimatePresence>
            {active && (
              <motion.div
                aria-hidden="true"
                initial={{ opacity: 0.3, scale: 0.995 }}
                animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.995, 1.01, 0.995] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-0 z-[10000] rounded-[inherit] border border-green-300/70 shadow-[0_0_28px_rgba(34,197,94,0.5),inset_0_0_32px_rgba(34,197,94,0.25)]"
              />
            )}
          </AnimatePresence>

          <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/80">
            {status} | {activeCameraLabel}
          </div>

          <div className="pointer-events-none absolute right-2 top-2 z-[10020] rounded-lg border border-orange-300/50 bg-[#081020]/86 px-2.5 py-1.5 text-[11px] font-semibold text-orange-100 shadow-[0_0_14px_rgba(245,130,32,0.24)]">
            <span className="inline-flex items-center gap-1">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-orange-300"
                animate={{ opacity: active ? [0.5, 1, 0.5] : 0.35, scale: active ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              />
              LIVE SPEED
            </span>
            <span className="ml-1">{speedLabel} • {liveSpeedDisplay ?? '--'} fps</span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] uppercase tracking-[0.16em] text-orange-200/85">
            Align code in center to maximize scan speed
          </div>

          <input
            ref={snapInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0] ?? null;
              event.currentTarget.value = '';
              await processManualSnapFile(file);
            }}
          />

          {manualSnapVisible && (
            <div className="absolute right-2 top-8 z-[10000]">
              <button
                type="button"
                onClick={() => snapInputRef.current?.click()}
                className="rounded-md border border-orange-300/55 bg-orange-500/25 px-2.5 py-1 text-[11px] font-semibold text-orange-100"
              >
                Manual Snap
              </button>
            </div>
          )}

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            animate={{ scale: [0.995, 1.005, 0.995], opacity: [0.78, 0.95, 0.78] }}
            transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              style={{ width: `${SCANNER_CONFIG.qrBoxSize}px`, height: `${SCANNER_CONFIG.qrBoxSize}px` }}
              className="relative rounded-xl border border-orange-300/80"
            >
              <div className="absolute -left-1 -top-1 h-8 w-8 border-l-2 border-t-2 border-orange-400" />
              <div className="absolute -right-1 -top-1 h-8 w-8 border-r-2 border-t-2 border-orange-400" />
              <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-2 border-l-2 border-orange-400" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-2 border-r-2 border-orange-400" />
              <div className="absolute inset-0 rounded-xl border border-orange-300/30" />
              <div className="absolute inset-0 rounded-xl bg-[linear-gradient(to_right,rgba(245,130,32,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,130,32,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-45" />

              {active && (
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-x-0 h-12 rounded-xl bg-gradient-to-b from-orange-200/30 via-orange-300/16 to-transparent mix-blend-screen"
                  animate={{ y: [-24, SCANNER_CONFIG.qrBoxSize - 20, -24], opacity: [0.45, 0.9, 0.45] }}
                  transition={{ duration: Math.max(0.6, scanSweepDuration), repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {status === 'scanning' && (
                <>
                  <motion.div
                    aria-hidden="true"
                    className="absolute left-0 right-0 z-20 h-[2px] bg-gradient-to-r from-transparent via-orange-100 to-transparent shadow-[0_0_18px_rgba(245,130,32,0.95)]"
                    animate={{ y: [2, SCANNER_CONFIG.qrBoxSize - 4, 2], opacity: [0.75, 1, 0.75] }}
                    transition={{
                      duration: isFinding ? Math.max(0.28, scanSweepDuration * 0.62) : Math.max(0.45, scanSweepDuration * 0.82),
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <motion.div
                    aria-hidden="true"
                    className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-orange-100 to-transparent shadow-[0_0_12px_rgba(245,130,32,0.7)]"
                    animate={{ y: [0, SCANNER_CONFIG.qrBoxSize - 3, 0], opacity: [0.55, 1, 0.55] }}
                    transition={{
                      duration: isFinding ? Math.max(0.35, scanSweepDuration * 0.75) : scanSweepDuration,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <motion.div
                    aria-hidden="true"
                    className="absolute left-0 right-0 h-7 bg-gradient-to-b from-orange-200/22 via-orange-300/12 to-transparent"
                    animate={{
                      y: [-14, SCANNER_CONFIG.qrBoxSize - 12, -14],
                      opacity: [sweepGlowOpacity * 0.5, sweepGlowOpacity, sweepGlowOpacity * 0.5],
                    }}
                    transition={{
                      duration: isFinding ? Math.max(0.35, scanSweepDuration * 0.75) : scanSweepDuration,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-xl border border-green-400/80"
                    animate={{ opacity: [0.35, 0.95, 0.35], scale: [0.995, 1.005, 0.995] }}
                    transition={{ duration: Math.max(0.55, scanSweepDuration * 0.8), repeat: Infinity, ease: 'easeInOut' }}
                  />
                </>
              )}
            </div>
          </motion.div>

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.03, 0.98] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute inset-0 z-[10001] grid place-items-center"
            >
              <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-orange-300/80 bg-[#2a1306]/55 text-3xl font-extrabold text-orange-100 shadow-[0_0_20px_rgba(245,130,32,0.58)]">
                !
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.14 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-0 bg-orange-300/15"
              />
            )}
          </AnimatePresence>

          {status === 'error' && (
            <div className="absolute inset-x-3 bottom-3 rounded-lg border border-orange-300/35 bg-[#0a1324]/85 p-3 text-xs text-orange-100 backdrop-blur">
              <p className="mb-2">{errorHint}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={restartScanner}
                  className="rounded-md border border-orange-300/50 bg-orange-500/20 px-3 py-1.5 text-[11px] font-semibold text-orange-100"
                >
                  Retry Scanner
                </button>
                <button
                  type="button"
                  onClick={() => snapInputRef.current?.click()}
                  className="rounded-md border border-orange-300/50 bg-orange-500/20 px-3 py-1.5 text-[11px] font-semibold text-orange-100"
                >
                  Manual Snap
                </button>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      <AnimatePresence>
        {scanFeedback?.visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10040] grid place-items-center bg-[#01040d]/74 px-4"
            onClick={dismissScanFeedback}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ type: 'spring', stiffness: 330, damping: 30, mass: 0.8 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-orange-300/45 bg-[#061127]/95 p-5 text-center shadow-[0_0_32px_rgba(245,130,32,0.24)]"
            >
              <div
                className={`mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border-2 text-2xl font-extrabold ${
                  scanFeedback.isCorrect
                    ? 'border-green-300/70 bg-green-900/35 text-green-100'
                    : 'border-orange-300/70 bg-orange-900/30 text-orange-100'
                }`}
              >
                {scanFeedback.icon ?? (scanFeedback.isCorrect ? '✓' : '!')}
              </div>

              <h3 className="text-lg font-semibold tracking-wide text-white">
                {scanFeedback.title}
              </h3>

              <p className="mt-2 text-sm text-orange-100/90">{scanFeedback.message}</p>

              {scanFeedback.locationName?.trim() ? (
                <div className="mt-4 rounded-lg border border-orange-300/30 bg-[#020915]/75 px-3 py-2 text-xs font-mono text-orange-100/80">
                  {scanFeedback.locationName}
                </div>
              ) : null}

              <button
                type="button"
                onClick={dismissScanFeedback}
                className="mt-5 w-full rounded-lg border border-orange-300/55 bg-orange-500/25 px-4 py-2 text-sm font-semibold text-orange-100 transition-transform active:scale-[0.98]"
              >
                Okay
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
