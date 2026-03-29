'use client';
import { useEffect, useMemo, useState } from 'react';
import ActiveMantrasPanel from '../../components/admin/ActiveMantrasPanel';
import ClaimScannerPanel from '../../components/admin/ClaimScannerPanel';
import IntegritySecurityPanel from '../../components/admin/IntegritySecurityPanel';
import AdminPinGate from '../../components/admin/AdminPinGate';
import AdminLookupStatus from '../../components/admin/AdminLookupStatus';
import AdminVerifyPanel from '../../components/admin/AdminVerifyPanel';
import MapSetManager from '../../components/admin/MapSetManager';
import PasscodePanel from '../../components/admin/PasscodePanel';
import ScrollJumpButtons from '../../components/admin/ScrollJumpButtons';
import SpaceBackground from '../../components/ui/SpaceBackground';
import SiteLegalFooter from '../../components/ui/SiteLegalFooter';
import BreathButton from '../../components/ui/BreathButton';
import { getClaimAuditApi, type ClaimAuditResult, lookupHunterApi } from '../../lib/api';
import type { Hunter } from '../../lib/db';
import { clearAdminSessionApi, establishAdminSessionApi, verifyPasscodeApi } from '../../lib/passcodeApi';

const ADMIN_SESSION_KEY = 'castlevania-admin-session-v1';

type DashState = 'idle' | 'loading' | 'invalid' | 'hunting' | 'finished' | 'claimed';
const getState = (hunter: Hunter | null): DashState => {
  if (!hunter) return 'invalid';
  if (hunter.status === 'FINISHED') return 'finished';
  if (hunter.status === 'CLAIMED') return 'claimed';
  return 'hunting';
};

export default function AdminPage() {
  const [role, setRole] = useState<'admin' | 'founder' | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [mantra, setMantra] = useState('');
  const [hunter, setHunter] = useState<Hunter | null>(null);
  const [claimAudit, setClaimAudit] = useState<ClaimAuditResult | null>(null);
  const [state, setState] = useState<DashState>('idle');
  const [message, setMessage] = useState('Enter a mantra ID to verify booth readiness.');
  useEffect(() => {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as { role?: 'admin' | 'founder'; unlocked?: boolean };
      if (session.unlocked && (session.role === 'admin' || session.role === 'founder')) {
        setUnlocked(true);
        setRole(session.role);
      }
    } catch {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ unlocked, role }));
  }, [role, unlocked]);
  const missingCount = useMemo(() => {
    if (!hunter) return 0;
    return Math.max(0, hunter.assigned_map.length - hunter.scanned_nodes.length);
  }, [hunter]);
  const onPinTap = (digit: string) => {
    if (pin.length >= 4) return;
    const next = `${pin}${digit}`;
    setPin(next);
    if (next.length !== 4) return;

    void (async () => {
      const result = await verifyPasscodeApi(next);
      if (!result.ok || !result.role) {
        setPin('');
        setPinError(result.message);
        return;
      }
      setUnlocked(true);
      setRole(result.role);
      setPinError('');

      if (next === '2026' && result.role === 'admin') {
        await establishAdminSessionApi(next);
      }
    })();
  };
  const logout = () => {
    setUnlocked(false);
    setRole(null);
    setPin('');
    setPinError('');
    localStorage.removeItem(ADMIN_SESSION_KEY);
    void clearAdminSessionApi();
  };
  const onLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = mantra.trim();
    if (!value) {
      setState('invalid');
      setMessage('INVALID / NOT FOUND');
      setHunter(null);
      setClaimAudit(null);
      return;
    }
    setState('loading');
    try {
      const [result, audit] = await Promise.all([
        lookupHunterApi(value),
        getClaimAuditApi(value).catch(() => null),
      ]);
      setMessage(result.message);
      setHunter(result.hunter);
      setClaimAudit(audit);
      setState(getState(result.hunter));
    } catch {
      setState('invalid');
      setMessage('INVALID / NOT FOUND');
      setHunter(null);
      setClaimAudit(null);
    }
  };
  const onPinKey = (key: string) => {
    if (key === '<') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'C') {
      setPin('');
      setPinError('');
      return;
    }
    onPinTap(key);
  };
  if (!unlocked) {
    return (
      <main className="relative min-h-screen px-5 py-10 text-white sm:px-8">
        <SpaceBackground />
        <AdminPinGate pin={pin} pinError={pinError} onTap={onPinKey} />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-5 py-10 text-white sm:px-8">
      <SpaceBackground />
      <section className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/12 bg-[#020611]/70 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-orange-200">Control Deck</p>
            <p className="mt-1 text-sm text-white/75">Role: <span className="font-semibold text-orange-100">{role === 'founder' ? 'Founder' : 'Admin'}</span></p>
          </div>
          <BreathButton onClick={logout} className="px-4 py-2 text-xs tracking-[0.16em]">
            LOG OUT
          </BreathButton>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <ClaimScannerPanel />

            <AdminVerifyPanel
              mantra={mantra}
              onChangeMantra={setMantra}
              onLookup={onLookup}
            />
            <AdminLookupStatus
              state={state}
              hunter={hunter}
              message={message}
              missingCount={missingCount}
              claimAudit={claimAudit}
            />

            <div className="rounded-xl border border-white/12 bg-[#020611]/70 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-orange-200">Creator Workspace</p>
              <MapSetManager />
            </div>
            <div className="rounded-xl border border-white/12 bg-[#020611]/70 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-orange-200">Security & Integrity</p>
              <IntegritySecurityPanel />
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
            {role === 'founder' && <PasscodePanel />}
            <ActiveMantrasPanel />
          </aside>
        </div>
      </section>
      <section className="mx-auto mt-5 max-w-6xl">
        <SiteLegalFooter compact />
      </section>
      <ScrollJumpButtons />
    </main>
  );
}
