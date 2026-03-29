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
  const [message, setMessage] = useState('Enter a mantra to verify.');
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
    <main className="relative min-h-[100svh] px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <SpaceBackground />
      <section className="relative z-10 mx-auto max-w-[1560px] space-y-5">
        <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,11,22,0.82)_0%,rgba(4,8,18,0.72)_100%)] px-5 py-5 shadow-[0_24px_64px_rgba(0,0,0,0.28)] sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-display text-[10px] uppercase tracking-[0.38em] text-orange-200/72">Admin</p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[3.1rem]">Control Deck</h1>
              <p className="mt-3 text-sm leading-6 text-white/40">Verify. Compose. Clear.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/55">
                Role <span className="ml-2 font-semibold text-orange-100">{role === 'founder' ? 'Founder' : 'Admin'}</span>
              </div>
              <BreathButton onClick={logout} className="px-4 py-2 text-xs tracking-[0.16em]">
                LOG OUT
              </BreathButton>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.96fr)_minmax(320px,0.84fr)]">
          <div className="space-y-5">
            <ClaimScannerPanel />
            <AdminVerifyPanel
              mantra={mantra}
              onChangeMantra={setMantra}
              onLookup={onLookup}
            />
          </div>

          <div className="space-y-5">
            <AdminLookupStatus
              state={state}
              hunter={hunter}
              message={message}
              missingCount={missingCount}
              claimAudit={claimAudit}
            />

            <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,11,22,0.82)_0%,rgba(4,8,18,0.72)_100%)] p-3 shadow-[0_24px_56px_rgba(0,0,0,0.22)]">
              <p className="mb-3 px-2 text-[10px] uppercase tracking-[0.32em] text-orange-200/72">Map Workspace</p>
              <MapSetManager />
            </div>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:h-fit">
            <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,11,22,0.82)_0%,rgba(4,8,18,0.72)_100%)] p-3 shadow-[0_24px_56px_rgba(0,0,0,0.22)]">
              <p className="mb-3 px-2 text-[10px] uppercase tracking-[0.32em] text-orange-200/72">Integrity</p>
              <IntegritySecurityPanel />
            </div>
            {role === 'founder' && <PasscodePanel />}
            <ActiveMantrasPanel />
          </aside>
        </div>
      </section>
      <section className="relative z-10 mx-auto mt-5 max-w-[1560px]">
        <SiteLegalFooter compact />
      </section>
      <ScrollJumpButtons />
    </main>
  );
}
