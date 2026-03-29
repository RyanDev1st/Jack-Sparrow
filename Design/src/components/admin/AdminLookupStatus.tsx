'use client';
import { AnimatePresence, motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import type { Hunter } from '../../lib/db';
import type { ClaimAuditResult } from '../../lib/api';

type DashState = 'idle' | 'loading' | 'invalid' | 'hunting' | 'finished' | 'claimed';

type AdminLookupStatusProps = {
  state: DashState;
  hunter: Hunter | null;
  message: string;
  missingCount: number;
  claimAudit: ClaimAuditResult | null;
};

export default function AdminLookupStatus({ state, hunter, message, missingCount, claimAudit }: AdminLookupStatusProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
      >
        {state === 'finished' && hunter && (
          <GlassCard className="border-2 border-orange-300 p-6 shadow-[0_0_32px_rgba(245,130,32,0.35)]">
            <p className="text-4xl font-black tracking-wide text-orange-200">READY TO CLAIM</p>
            <p className="mt-2 text-sm text-white/80">{hunter.mantra_id}</p>
          </GlassCard>
        )}
        {state === 'hunting' && hunter && (
          <GlassCard className="p-6">
            <p className="text-2xl font-bold text-white/90">STILL HUNTING</p>
            <p className="mt-2 text-base text-white/75">{missingCount} node(s) remaining.</p>
          </GlassCard>
        )}
        {state === 'claimed' && hunter && (
          <GlassCard className="p-6">
            <p className="text-2xl font-bold text-orange-200">ALREADY CLAIMED</p>
          </GlassCard>
        )}
        {(state === 'invalid' || (state === 'loading' && !hunter)) && (
          <GlassCard className="border-2 border-orange-300/70 p-6">
            <p className="text-2xl font-bold text-orange-200">{state === 'loading' ? 'CHECKING...' : 'INVALID / NOT FOUND'}</p>
            <p className="mt-2 text-base text-white/75">{message}</p>
          </GlassCard>
        )}
        {state === 'loading' && hunter && (
          <GlassCard className="p-6">
            <p className="text-xl font-bold text-orange-200">UPDATING...</p>
          </GlassCard>
        )}
        {state === 'idle' && (
          <GlassCard className="p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-white/62">{message}</p>
          </GlassCard>
        )}

        {claimAudit && claimAudit.ok && (
          <GlassCard className="mt-4 border border-orange-300/40 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Claim Audit</p>
            <p className="mt-2 text-sm text-orange-100">Attempts: {claimAudit.totalUserClaims}</p>
            {claimAudit.repeatHistory.length > 0 ? (
              <div className="mt-3 max-h-48 space-y-2 overflow-auto text-xs text-white/80">
                {claimAudit.repeatHistory.map((entry) => (
                  <div key={`${entry.sessionId}-${entry.updatedAt}`} className="rounded-lg border border-white/12 bg-[#09142a]/70 p-2">
                    <p>Session: {entry.sessionId}</p>
                    <p>Mantra: {entry.mantraId || 'Unknown'}</p>
                    <p>Status: {entry.hunterStatus}</p>
                    <p>When: {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : 'Unknown'}</p>
                    <p>Device: {entry.deviceFingerprint ?? '-'}</p>
                    <p>Browser: {entry.browserId ?? '-'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-white/70">No audit history.</p>
            )}
          </GlassCard>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
