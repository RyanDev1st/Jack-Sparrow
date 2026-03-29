'use client';

import { useEffect, useState } from 'react';
import { useRef } from 'react';
import GlassCard from '../ui/GlassCard';
import {
  addPasscodeApi,
  deletePasscodeApi,
  listPasscodesApi,
  type PasscodeEntry,
  updatePasscodeApi,
} from '../../lib/passcodeApi';

const blankForm = { code: '', label: '', role: 'admin' as 'admin' | 'founder' };

export default function PasscodePanel() {
  const [items, setItems] = useState<PasscodeEntry[]>([]);
  const [founderCode, setFounderCode] = useState('');
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const reload = async () => {
    setItems(await listPasscodesApi());
  };

  useEffect(() => {
      if (loadedRef.current) return;
      loadedRef.current = true;
    void reload();
  }, []);

  const withReload = async (action: () => Promise<{ ok: boolean; message: string }>) => {
    setLoading(true);
    try {
      const result = await action();
      setMessage(result.message);
      if (result.ok) {
        await reload();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Founder Passcodes</p>
      <p className="mt-2 text-sm text-white/75">All updates are validated on server with founder PIN.</p>

      <input
        value={founderCode}
        onChange={(e) => setFounderCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="Founder PIN"
        className="mt-3 w-full rounded-lg border border-white/15 bg-[#020611]/80 px-3 py-2 text-sm"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input
          value={form.label}
          onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
          placeholder="Label"
          className="rounded border border-white/15 bg-[#020611]/80 px-2 py-2 text-sm"
        />
        <input
          value={form.code}
          onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
          placeholder="4-digit PIN"
          className="rounded border border-white/15 bg-[#020611]/80 px-2 py-2 text-sm"
        />
        <select
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value === 'founder' ? 'founder' : 'admin' }))}
          className="rounded border border-white/15 bg-[#020611]/80 px-2 py-2 text-sm"
        >
          <option value="admin">admin</option>
          <option value="founder">founder</option>
        </select>
      </div>

      <button
        onClick={() => void withReload(() => addPasscodeApi(founderCode, form.code, form.role, form.label))}
        disabled={loading}
        className="mt-2 w-full rounded-lg border border-white/20 bg-[#f58220]/85 px-3 py-2 text-sm font-semibold text-[#1a0b00]"
      >
        ADD PASSCODE
      </button>

      {message && <p className="mt-2 text-sm text-orange-100">{message}</p>}

      <div className="mt-3 space-y-2">
        {items.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-white/12 bg-[#020611]/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-orange-200">{entry.label} ({entry.role})</p>
              <label className="flex items-center gap-2 text-xs text-white/75">
                Active
                <input
                  type="checkbox"
                  checked={entry.active}
                  onChange={(e) => {
                    void withReload(() => updatePasscodeApi(founderCode, entry.id, { active: e.target.checked }));
                  }}
                />
              </label>
            </div>
            <p className="mt-1 text-xs text-white/70">PIN: {entry.code}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const next = window.prompt('New 4-digit PIN', entry.code) ?? '';
                  void withReload(() => updatePasscodeApi(founderCode, entry.id, { code: next }));
                }}
                className="rounded border border-white/20 bg-[#09142a] px-2 py-1 text-xs text-white/85"
              >
                CHANGE PIN
              </button>
              <button
                onClick={() => void withReload(() => deletePasscodeApi(founderCode, entry.id))}
                className="rounded border border-orange-300/35 bg-[#2a1306] px-2 py-1 text-xs text-orange-100"
              >
                DELETE
              </button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
