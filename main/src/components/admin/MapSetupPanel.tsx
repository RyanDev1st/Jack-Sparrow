'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import BreathButton from '../ui/BreathButton';
import GlassCard from '../ui/GlassCard';
import { listMapConfigsApi, saveMapConfigApi, type MapConfig } from '../../lib/mapApi';

export default function MapSetupPanel() {
  const [name, setName] = useState('');
  const [keys, setKeys] = useState('');
  const [message, setMessage] = useState('');
  const [maps, setMaps] = useState<MapConfig[]>([]);

  const refreshMaps = async () => {
    const next = await listMapConfigsApi();
    setMaps(next);
  };

  useEffect(() => {
    void refreshMaps();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await saveMapConfigApi(name, keys);
    setMessage(result.message);
    if (!result.ok) {
      return;
    }
    setName('');
    setKeys('');
    await refreshMaps();
  };

  return (
    <GlassCard className="p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Map Setup</p>
      <form onSubmit={handleSave} className="mt-3 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Map Name"
          className="w-full rounded-lg border border-white/15 bg-[#020611]/80 px-4 py-3 text-sm outline-none focus:border-orange-300"
        />
        <textarea
          value={keys}
          onChange={(e) => setKeys(e.target.value)}
          placeholder="node_1, node_02, node_003"
          rows={3}
          className="w-full rounded-lg border border-white/15 bg-[#020611]/80 px-4 py-3 text-sm outline-none focus:border-orange-300"
        />
        <BreathButton type="submit" className="w-full justify-center text-sm">SAVE MAP</BreathButton>
      </form>

      {message && <p className="mt-3 text-sm text-white/80">{message}</p>}

      <div className="mt-4 space-y-2">
        {maps.map((map) => (
          <motion.div
            key={map.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className="rounded-lg border border-white/12 bg-[#020611]/70 px-3 py-2"
          >
            <p className="text-sm font-semibold text-orange-200">{map.name}</p>
            <p className="text-xs text-white/70">{map.keys.join(', ')}</p>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
