'use client';

import { useState } from 'react';
import GlassCard from '../ui/GlassCard';
import QRScanner from '../scanner';
import { finalizeClaimBySessionApi, scanClaimApi, type ClaimScanResult } from '../../lib/claimApi';
import { getBrowserId, getDeviceFingerprint } from '../../lib/deviceFingerprint';
import type { ScannerPayloadOutcome } from '../../hooks/useScanner';

const parseSessionId = (value: string): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return String(url.searchParams.get('sid') ?? '').trim();
    } catch {
      return '';
    }
  }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw) as { session_id?: string };
      return String(parsed.session_id ?? '').trim();
    } catch {
      return '';
    }
  }
  return raw;
};

export default function ClaimScannerPanel() {
  const [result, setResult] = useState<ClaimScanResult | null>(null);
  const [message, setMessage] = useState('Scan claim QR.');
  const [busy, setBusy] = useState(false);
  const [manualIdentifier, setManualIdentifier] = useState('');

  const runScan = async (identifierRaw: string): Promise<ClaimScanResult | null> => {
    const identifier = parseSessionId(identifierRaw);
    if (!identifier) {
      setMessage('Invalid payload. Expected session_id, mantra_id, or mantra_code.');
      return null;
    }

    setBusy(true);
    try {
      const [fingerprint, browserId] = await Promise.all([getDeviceFingerprint(), getBrowserId()]);
      const next = await scanClaimApi(identifier, fingerprint, browserId);
      setResult(next);
      setMessage(next.message);
      return next;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Claim scan failed.';
      setMessage(messageText);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const onPayload = async (rawText: string): Promise<ScannerPayloadOutcome> => {
    const next = await runScan(rawText);
    if (!next) {
      return {
        isCorrect: false,
        title: 'Claim Scan Failed',
        message: 'Unable to process this claim QR. Try again or use manual code entry.',
        locationName: '',
        icon: '!',
        continueScanning: true,
      };
    }

    if (!next.ok) {
      return {
        isCorrect: false,
        title: 'Claim Not Ready',
        message: next.message,
        locationName: '',
        icon: '!',
        continueScanning: true,
      };
    }

    return {
      isCorrect: true,
      title: 'Claim Scan Successful',
      message: 'Congratulations! Claim QR accepted. You can now mark this mantra as CLAIMED.',
      locationName: '',
      icon: '🎉',
      continueScanning: true,
    };
  };

  const finalize = async () => {
    if (!result?.sessionId) return;
    setBusy(true);
    try {
      const response = await finalizeClaimBySessionApi(result.sessionId);
      setMessage(response.message);
      const [fingerprint, browserId] = await Promise.all([getDeviceFingerprint(), getBrowserId()]);
      const refreshed = await scanClaimApi(result.sessionId, fingerprint, browserId);
      setResult(refreshed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Claim Scanner</p>

      <div className="mt-3">
        <QRScanner onPayload={onPayload} className="mx-auto max-w-sm" fps={20} />
      </div>

      <form
        className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void runScan(manualIdentifier);
        }}
      >
        <input
          value={manualIdentifier}
          onChange={(event) => setManualIdentifier(event.target.value)}
          placeholder="SESSION / MANTRA / CODE"
          className="rounded-lg border border-white/15 bg-[#020611]/80 px-3 py-2 text-xs uppercase tracking-[0.12em] text-white outline-none focus:border-orange-300"
        />
        <button
          type="submit"
          disabled={busy || !manualIdentifier.trim()}
          className="rounded-lg border border-white/20 bg-[#f58220]/85 px-3 py-2 text-xs font-semibold text-[#1a0b00] disabled:opacity-50"
        >
          SUBMIT CODE
        </button>
      </form>

      <div className="mt-3 rounded-lg border border-white/12 bg-[#020611]/70 p-3">
        <p className="text-xs text-white/65">Status</p>
        <p className="mt-1 text-lg font-semibold text-orange-100">{result?.statusLabel ?? 'Waiting for scan'}</p>
        <p className="mt-2 text-xs text-white/70">{message}</p>
        {result && (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-white/66">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">Session {result.sessionId}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">Mantra {result.mantraCode}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">State {result.hunterStatus}</span>
            {typeof result.totalUserClaims === 'number' && <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">Claims {result.totalUserClaims}</span>}
          </div>
        )}
        {result && (result.totalUserClaims ?? 0) > 2 && Array.isArray(result.repeatHistory) && result.repeatHistory.length > 0 && (
          <div className="mt-3 rounded-lg border border-orange-300/35 bg-[#2a1306]/45 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-200">Repeat Audit</p>
            <div className="mt-2 max-h-40 space-y-1 overflow-auto text-[11px] text-orange-100/90">
              {result.repeatHistory.map((entry) => (
                <div key={entry.sessionId} className="rounded border border-orange-300/20 bg-[#061127]/55 px-2 py-1">
                  <p>Session: {entry.sessionId}</p>
                  <p>Mantra: {entry.mantraId || 'Unknown'}</p>
                  <p>Status: {entry.hunterStatus}</p>
                  <p>When: {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : 'Unknown'}</p>
                  <p>Device: {entry.deviceFingerprint ?? '-'}</p>
                  <p>Browser: {entry.browserId ?? '-'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        disabled={busy || !result?.sessionId}
        onClick={() => void finalize()}
        className="mt-3 w-full rounded-lg border border-white/20 bg-[#f58220]/85 px-3 py-2 text-sm font-semibold text-[#1a0b00] disabled:opacity-50"
      >
        MARK AS CLAIMED
      </button>
    </GlassCard>
  );
}
