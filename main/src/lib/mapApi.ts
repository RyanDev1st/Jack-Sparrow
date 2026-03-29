import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const mapsCollection = 'maps';

export type MapConfig = {
  id: string;
  name: string;
  keys: string[];
  createdAt: number;
};

const normalize = (value: string): string => value.trim();

export async function saveMapConfigApi(name: string, csvKeys: string): Promise<{ ok: boolean; message: string }> {
  const normalizedName = normalize(name);
  const keys = csvKeys
    .split(',')
    .map(normalize)
    .filter(Boolean);

  if (!normalizedName || keys.length === 0) {
    return { ok: false, message: 'Map Name and at least one payload key are required.' };
  }

  const id = `${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
  const payload: MapConfig = { id, name: normalizedName, keys, createdAt: Date.now() };
  await setDoc(doc(db, mapsCollection, id), payload);
  return { ok: true, message: 'Map saved.' };
}

export async function listMapConfigsApi(): Promise<MapConfig[]> {
  const snap = await getDocs(collection(db, mapsCollection));
  return snap.docs
    .map((d) => d.data() as Partial<MapConfig>)
    .filter((d) => Array.isArray(d.keys) && typeof d.name === 'string')
    .map((d) => ({
      id: String(d.id ?? ''),
      name: String(d.name),
      keys: (d.keys ?? []).map(String),
      createdAt: Number(d.createdAt ?? 0),
    }))
    .filter((d) => Boolean(d.id))
    .sort((a, b) => b.createdAt - a.createdAt);
}
