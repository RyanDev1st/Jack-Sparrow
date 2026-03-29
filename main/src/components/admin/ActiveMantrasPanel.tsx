'use client';

import { useEffect, useState } from 'react';
import GlassCard from '../ui/GlassCard';
import BreathButton from '../ui/BreathButton';
import { listActiveMantrasApi, type ActiveHunterSummary } from '../../lib/api';

const getStatusColor = (status: string) => {
  if (status === 'HUNTING') return 'text-blue-300 border-blue-400/40';
  if (status === 'FINISHED') return 'text-orange-300 border-orange-400/40';
  if (status === 'CLAIMED') return 'text-green-300 border-green-400/40';
  return 'text-white/60 border-white/15';
};

const getStatusIcon = (status: string) => {
  if (status === 'HUNTING') return '🔍';
  if (status === 'FINISHED') return '✓';
  if (status === 'CLAIMED') return '★';
  return '?';
};

const getStatusBg = (status: string) => {
  if (status === 'HUNTING') return 'bg-blue-900/25';
  if (status === 'FINISHED') return 'bg-orange-900/25';
  if (status === 'CLAIMED') return 'bg-green-900/25';
  return 'bg-white/5';
};

export default function ActiveMantrasPanel() {
  const [items, setItems] = useState<ActiveHunterSummary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    try {
      setLoading(true);
      const nextItems = await listActiveMantrasApi();
      setItems(Array.isArray(nextItems) ? nextItems : []);
      setError('');
    } catch {
      setItems([]);
      setError('Unable to load active mantra sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => {
      void reload();
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Active Mantras</p>
        <BreathButton onClick={() => void reload()} className="px-3 py-2 text-xs">Refresh</BreathButton>
      </div>
      {error && <p className="mt-2 text-sm text-orange-200">{error}</p>}
      <div className="mt-3 space-y-2">
        {loading && <p className="text-sm text-white/65">Loading active sessions...</p>}
        {!loading && items.length === 0 && <p className="text-sm text-white/65">No active sessions found.</p>}
        {items.map((item) => (
          <div
            key={item.mantra_id}
            className={`rounded-lg border p-3 text-sm transition-colors ${getStatusBg(item.status)} ${getStatusColor(item.status)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getStatusIcon(item.status)}</span>
                  <p className="font-bold">{item.mantra_id}</p>
                </div>
                <p className="mt-1 text-[11px] text-white/55">ID: {item.session_id}</p>
              </div>
              <div className="text-right text-xs font-semibold">
                <p>{item.scanned_count}/{item.assigned_count}</p>
                <p className="text-[11px] text-white/60">{item.status}</p>
              </div>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-current transition-all duration-300"
                style={{ width: `${(item.scanned_count / item.assigned_count) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
