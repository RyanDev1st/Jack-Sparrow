'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../ui/GlassCard';
import { buildClaimGatePayload, generateClaimQrDataUrl } from '../../lib/claimQr';

type CompletionClaimCardProps = {
  sessionId: string;
  mantraId: string;
  mantraCode: string;
  onReset: () => void;
};

export default function CompletionClaimCard({ sessionId, mantraId, mantraCode, onReset }: CompletionClaimCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const compactMantraId = useMemo(() => {
    const suffix = mantraId.match(/#([A-Z0-9]{4})$/)?.[1] ?? '0000';
    const prefix = mantraCode.split('-')[0] || 'MAN';
    return `${prefix}-${suffix}`;
  }, [mantraCode, mantraId]);

  useEffect(() => {
    if (!sessionId) {
      setQrDataUrl('');
      return;
    }

    let active = true;
    const generate = async () => {
      setIsGeneratingQr(true);
      setQrError('');
      try {
        const payload = buildClaimGatePayload(sessionId);
        const dataUrl = await generateClaimQrDataUrl(payload, 1);
        if (active) setQrDataUrl(dataUrl);
      } catch {
        if (active) {
          setQrDataUrl('');
          setQrError('Failed to generate claim QR. Tap retry.');
        }
      } finally {
        if (active) setIsGeneratingQr(false);
      }
    };

    void generate();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const retryQr = async () => {
    if (!sessionId || isGeneratingQr) return;
    setIsGeneratingQr(true);
    setQrError('');
    try {
      const payload = buildClaimGatePayload(sessionId);
      setQrDataUrl(await generateClaimQrDataUrl(payload, 1));
    } catch {
      setQrError('Failed to generate claim QR. Check connection and retry.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  return (
    <section className="pointer-events-none fixed inset-0 z-40 grid place-items-center p-4">
      <GlassCard className="pointer-events-auto w-full max-w-xl overflow-hidden border-orange-300/40 bg-[#020617]/95 p-0 text-center shadow-[0_0_50px_rgba(245,130,32,0.24)]">
        <div className="relative overflow-hidden rounded-2xl bg-[#020617] p-6">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-16 opacity-60 mix-blend-overlay"
            style={{ background: 'radial-gradient(40% 40% at 50% 50%, rgba(245,130,32,0.35) 0%, rgba(255,255,255,0) 70%)' }}
            animate={{ x: ['-24%', '24%', '-24%'], y: ['-10%', '10%', '-10%'] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />

          <p className="text-xs uppercase tracking-[0.24em] text-orange-200">Treasure Hunt Complete</p>
          <h2 className="mt-3 text-2xl font-semibold text-orange-100">Victory Confirmed</h2>
          <p className="mt-3 text-sm leading-relaxed text-orange-100/90">
            Present this claim below at the booth. Staff will verify your completion and unlock your reward.
          </p>

          <div className="relative mt-5 overflow-hidden rounded-2xl border border-orange-300/20 bg-white/[0.03] p-4 backdrop-blur-[16px]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-300/20 via-transparent to-transparent" />
            
            <div className="relative space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/65">Check-In Code</p>
                <div className="mt-2 rounded-lg border border-green-400/40 bg-green-900/15 px-4 py-3">
                  <p className="text-3xl font-extrabold text-green-300 font-mono tracking-widest">{mantraCode}</p>
                </div>
              </div>

              <div className="relative">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Claim QR"
                    className="relative mx-auto h-44 w-44 rounded-lg border border-orange-300/35 bg-[#020611] p-1 shadow-[0_0_24px_rgba(245,130,32,0.45)]"
                  />
                )}
                {!qrDataUrl && isGeneratingQr && <p className="relative mt-4 text-xs text-white/70">Generating claim QR...</p>}
                {!qrDataUrl && qrError && (
                  <div className="relative mt-4 space-y-2">
                    <p className="text-xs text-orange-200/90">{qrError}</p>
                    <button
                      type="button"
                      onClick={() => void retryQr()}
                      className="rounded-md border border-orange-300/45 bg-orange-500/20 px-3 py-1.5 text-xs font-semibold text-orange-100"
                    >
                      RETRY QR
                    </button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/65">Mantra</p>
                <div className="mt-2 rounded-lg border border-white/15 bg-[#081020]/70 px-3 py-2 text-sm font-semibold tracking-[0.16em] text-orange-100">
                  {compactMantraId}
                </div>
              </div>

              <p className="relative text-[11px] text-white/50">Session ID: {sessionId}</p>
            </div>
          </div>

          <button onClick={onReset} className="mt-5 w-full rounded-lg border border-orange-200/45 bg-orange-500/25 px-4 py-2 text-sm font-semibold text-orange-100">
            RETURN TO START
          </button>
        </div>
      </GlassCard>
    </section>
  );
}
