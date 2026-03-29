'use client';

import { useEffect, useState } from 'react';
import GlassCard from '../ui/GlassCard';
import { auditIntegrityApi, resolvePoolMismatchesApi, type IntegrityReport } from '../../lib/integrityApi';

const emptyReport: IntegrityReport = {
  ok: true,
  duplicateCodesWithinMap: [],
  duplicateCodesAcrossMaps: [],
  missingCodes: [],
  poolMismatches: [],
  message: 'No report yet.',
};

export default function IntegritySecurityPanel() {
  const [report, setReport] = useState<IntegrityReport>(emptyReport);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const next = await auditIntegrityApi();
      setReport(next);
      setMessage(next.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runAudit();
    const tick = () => {
      if (document.visibilityState === 'visible') {
        void runAudit();
      }
    };
    const id = window.setInterval(tick, 45000);
    const handleVisibility = () => tick();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const resolvePools = async () => {
    setLoading(true);
    try {
      const result = await resolvePoolMismatchesApi();
      setMessage(result.message);
      await runAudit();
    } finally {
      setLoading(false);
    }
  };

  const issueCount = report.duplicateCodesWithinMap.length
    + report.duplicateCodesAcrossMaps.length
    + report.missingCodes.length
    + report.poolMismatches.length;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Integrity & Security</p>
        <button onClick={() => void runAudit()} className="rounded border border-white/20 bg-[#09142a] px-2 py-1 text-xs text-white/85">
          AUDIT NOW
        </button>
      </div>

      <p className={`mt-2 text-sm ${issueCount > 0 ? 'text-orange-200' : 'text-green-200'}`}>
        {issueCount > 0 ? `${issueCount} issue(s) found` : 'No integrity issues detected'}
      </p>
      {message && <p className="mt-1 text-xs text-white/75">{message}</p>}

      <div className="mt-3 space-y-2 text-xs text-white/80">
        {report.duplicateCodesWithinMap.map((item) => (
          <p key={`local-${item.mapId}`}>Duplicate in map {item.mapId}: {item.duplicates.join(', ')}</p>
        ))}
        {report.duplicateCodesAcrossMaps.map((item) => (
          <p key={`cross-${item.code}`}>Code {item.code} reused across maps: {item.mapIds.join(', ')}</p>
        ))}
        {report.missingCodes.map((item) => (
          <p key={`missing-${item.mapId}-${item.zoneId}`}>Missing location code in map {item.mapId} zone {item.zoneId}</p>
        ))}
        {report.poolMismatches.map((item) => (
          <p key={`pool-${item.mapId}`}>Pool mismatch in {item.mapId}: expected {item.expectedCount}, actual {item.actualCount}</p>
        ))}
      </div>

      <button
        disabled={loading || report.poolMismatches.length === 0}
        onClick={() => void resolvePools()}
        className="mt-3 w-full rounded-lg border border-orange-300/35 bg-[#2a1306] px-3 py-2 text-sm text-orange-100 disabled:opacity-50"
      >
        AUTO-REPAIR POOL MISMATCHES
      </button>
    </GlassCard>
  );
}
