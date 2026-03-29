'use client';

import { useEffect, useState } from 'react';
import GlassCard from '../ui/GlassCard';
import MapSetLibrary from './MapSetLibrary';
import MapSetWorkbench from './MapSetWorkbench';
import { listMapSetsApi, saveMapSetApi, type MapSet } from '../../lib/mapSetApi';

export default function MapSetManager() {
  const [mapSets, setMapSets] = useState<MapSet[]>([]);
  const [message, setMessage] = useState('');

  const reload = async () => setMapSets(await listMapSetsApi());

  useEffect(() => {
    void reload();
  }, []);

  return (
    <GlassCard className="p-5">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Map Sets</p>
        <h2 className="mt-3 font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">Route Composer</h2>
        <p className="mt-2 text-sm leading-6 text-white/44">Map. Zones. Entries. Sets.</p>
      </div>

      <MapSetWorkbench
        saveLabel="SAVE MAP SET"
        onSave={async (next) => {
          const result = await saveMapSetApi(next);
          setMessage(result.message);
          if (!result.ok) throw new Error(result.message);
          await reload();
        }}
      />

      {message && <p className="mt-4 text-sm text-white/80">{message}</p>}

      <div className="mt-5">
        <MapSetLibrary mapSets={mapSets} onMessage={setMessage} onReload={reload} />
      </div>
    </GlassCard>
  );
}
