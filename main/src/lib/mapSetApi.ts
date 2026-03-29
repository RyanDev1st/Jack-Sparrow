import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { normalizeZone } from './zoneGeometry';
import { areColorsDistinct } from './zoneColor';

const mapSetsCollection = 'map_sets';
const mapCodePoolsCollection = 'map_code_pools';
let lastSelectedMapSetId = '';

export type ZoneShape = 'circle' | 'oval';

export type ZoneLocation = {
  id: string;
  name: string;
  locationCode: string;
  description: string;
  riddle: string;
};

export type ZoneRouteSet = {
  id: string;
  name: string;
  locationIds: string[];
};

export type Zone = {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  name: string;
  locationCode?: string;
  description?: string;
  riddle?: string;
  shape?: ZoneShape;
  radiusX?: number;
  radiusY?: number;
  rotation?: number;
  locations?: ZoneLocation[];
  routeSets?: ZoneRouteSet[];
};

export type MapSet = {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileDataUrl: string;
  zones: Zone[];
  createdAt: number;
};

export type RandomMapSelection = {
  id: string;
  name: string;
  fileType: string;
  codes: string[];
  clueIds: string[];
};

const normalize = (value: string) => value.trim();
const normalizeCode = (value: string) => normalize(value);
const normalizeText = (value: string) => normalize(value);

const createLocationId = (zoneId: string, index: number) => `${zoneId}-loc-${index + 1}`;
const createRouteSetId = (zoneId: string, index: number) => `${zoneId}-set-${index + 1}`;

export const getZoneLocations = (zone: Zone): ZoneLocation[] => {
  if (Array.isArray(zone.locations) && zone.locations.length > 0) {
    return zone.locations.map((location, index) => ({
      id: normalizeText(String(location.id ?? '')) || createLocationId(zone.id, index),
      name: normalizeText(String(location.name ?? '')) || `${zone.name || 'Location'} ${index + 1}`,
      locationCode: normalizeCode(String(location.locationCode ?? '')),
      description: normalizeText(String(location.description ?? '')),
      riddle: normalizeText(String(location.riddle ?? '')),
    }));
  }

  const fallbackName = normalizeText(String(zone.name ?? '')) || 'Location 1';
  const fallbackLocation: ZoneLocation = {
    id: createLocationId(zone.id, 0),
    name: fallbackName,
    locationCode: normalizeCode(String(zone.locationCode ?? '')),
    description: normalizeText(String(zone.description ?? '')),
    riddle: normalizeText(String(zone.riddle ?? '')),
  };

  return [fallbackLocation];
};

export const getZoneRouteSets = (zone: Zone): ZoneRouteSet[] => {
  const locations = getZoneLocations(zone);
  const validLocationIds = new Set(locations.map((location) => location.id));

  if (Array.isArray(zone.routeSets) && zone.routeSets.length > 0) {
    const normalized = zone.routeSets
      .map((routeSet, index) => ({
        id: normalizeText(String(routeSet.id ?? '')) || createRouteSetId(zone.id, index),
        name: normalizeText(String(routeSet.name ?? '')) || `Set ${index + 1}`,
        locationIds: Array.from(
          new Set((routeSet.locationIds ?? []).map((value) => normalizeText(String(value))).filter((value) => validLocationIds.has(value))),
        ),
      }))
      .filter((routeSet) => routeSet.locationIds.length > 0);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return locations.length > 0
    ? [
        {
          id: createRouteSetId(zone.id, 0),
          name: 'Set 1',
          locationIds: locations.map((location) => location.id),
        },
      ]
    : [];
}

export const getZoneActiveLocations = (zone: Zone, assignedClueIds?: Iterable<string> | null): ZoneLocation[] => {
  const locations = getZoneLocations(zone);
  if (!assignedClueIds) return locations;

  const assignedSet = assignedClueIds instanceof Set ? assignedClueIds : new Set(Array.from(assignedClueIds));
  const active = locations.filter((location) => assignedSet.has(location.id));
  return active.length > 0 ? active : locations;
};

export const getMapAllCodes = (map: Pick<MapSet, 'zones'>): string[] => {
  const unique = new Set<string>();
  map.zones.forEach((zone) => {
    getZoneLocations(zone).forEach((location) => {
      const code = normalizeCode(location.locationCode);
      if (code) unique.add(code);
    });
  });
  return Array.from(unique.values());
};

export const getMapAllClueIds = (map: Pick<MapSet, 'zones'>): string[] => {
  const unique = new Set<string>();
  map.zones.forEach((zone) => {
    getZoneLocations(zone).forEach((location) => {
      if (location.id) unique.add(location.id);
    });
  });
  return Array.from(unique.values());
};

export const getMapLocationByCode = (map: Pick<MapSet, 'zones'>, codeRaw: string): (ZoneLocation & { zoneId: string; zoneName: string }) | null => {
  const code = normalizeCode(codeRaw);
  if (!code) return null;

  for (const zone of map.zones) {
    const match = getZoneLocations(zone).find((location) => normalizeCode(location.locationCode) === code);
    if (match) {
      return { ...match, zoneId: zone.id, zoneName: zone.name };
    }
  }

  return null;
};

const mapDocumentToMapSet = (data: Partial<MapSet>, fallbackId: string): MapSet | null => {
  if (typeof data.name !== 'string' || typeof data.fileDataUrl !== 'string' || !Array.isArray(data.zones)) {
    return null;
  }

  return {
    id: String(data.id ?? fallbackId),
    name: String(data.name),
    fileName: String(data.fileName ?? ''),
    fileType: String(data.fileType ?? ''),
    fileDataUrl: String(data.fileDataUrl),
    zones: data.zones.map((zone, index) =>
      normalizeZone({
        id: String((zone as Zone).id ?? `zone-${index + 1}`),
        x: Number((zone as Zone).x ?? 50),
        y: Number((zone as Zone).y ?? 50),
        radius: Number((zone as Zone).radius ?? 5.2),
        radiusX: Number((zone as Zone).radiusX ?? (zone as Zone).radius ?? 5.2),
        radiusY: Number((zone as Zone).radiusY ?? (zone as Zone).radius ?? 5.2),
        rotation: Number((zone as Zone).rotation ?? 0),
        shape: (zone as Zone).shape,
        color: String((zone as Zone).color ?? '#f58220'),
        name: String((zone as Zone).name ?? `Zone ${index + 1}`),
        locationCode: String((zone as Zone).locationCode ?? ''),
        description: String((zone as Zone).description ?? ''),
        riddle: String((zone as Zone).riddle ?? ''),
        locations: Array.isArray((zone as Zone).locations) ? (zone as Zone).locations : undefined,
        routeSets: Array.isArray((zone as Zone).routeSets) ? (zone as Zone).routeSets : undefined,
      }),
    ),
    createdAt: Number(data.createdAt ?? 0),
  };
};

const collectGlobalCodes = async (excludeMapId = ''): Promise<Set<string>> => {
  const snap = await getDocs(collection(db, mapSetsCollection));
  const out = new Set<string>();

  snap.docs.forEach((entry) => {
    const map = mapDocumentToMapSet(entry.data() as Partial<MapSet>, entry.id);
    if (!map) return;
    if (excludeMapId && map.id === excludeMapId) return;
    getMapAllCodes(map).forEach((code) => out.add(code));
  });

  return out;
};

const validateZones = async (zones: Zone[], mapId = ''): Promise<{ ok: boolean; message: string }> => {
  if (zones.length === 0) {
    return { ok: false, message: 'At least one zone is required.' };
  }

  const allLocations = zones.flatMap((zone) =>
    getZoneLocations(normalizeZone(zone)).map((location) => ({ ...location, zoneName: zone.name, zoneColor: zone.color })),
  );

  if (allLocations.some((location) => !location.locationCode)) {
    return { ok: false, message: 'Every location entry must have a unique code.' };
  }

  const missingDescription = allLocations.find((location) => !location.description);
  if (missingDescription) {
    return { ok: false, message: `Every location entry must include a location description (${missingDescription.name}).` };
  }

  const missingRiddle = allLocations.find((location) => !location.riddle);
  if (missingRiddle) {
    return { ok: false, message: `Every location entry must include a riddle (${missingRiddle.name}).` };
  }

  const localSet = new Set<string>();
  for (const location of allLocations) {
    if (localSet.has(location.locationCode)) {
      return { ok: false, message: `Duplicate location code in this map: ${location.locationCode}` };
    }
    localSet.add(location.locationCode);
  }

  const globalCodes = await collectGlobalCodes(mapId);
  const globalCollision = allLocations.find((location) => globalCodes.has(location.locationCode));
  if (globalCollision) {
    return { ok: false, message: `Location code already exists in another map: ${globalCollision.locationCode}` };
  }

  for (const zone of zones.map((entry) => normalizeZone(entry))) {
    const locations = getZoneLocations(zone);
    if (locations.length === 0) {
      return { ok: false, message: `Zone ${zone.name} must contain at least one location entry.` };
    }

    const routeSets = getZoneRouteSets(zone);
    if (routeSets.length === 0) {
      return { ok: false, message: `Zone ${zone.name} must contain at least one route set.` };
    }
  }

  for (let i = 0; i < zones.length; i += 1) {
    for (let j = i + 1; j < zones.length; j += 1) {
      if (!areColorsDistinct(zones[i].color, zones[j].color)) {
        return { ok: false, message: `Zone colors are too similar (${zones[i].name} and ${zones[j].name}).` };
      }
    }
  }

  return { ok: true, message: 'Zones valid.' };
};

export async function saveMapSetApi(payload: Omit<MapSet, 'id' | 'createdAt'>): Promise<{ ok: boolean; message: string }> {
  if (!normalize(payload.name) || !payload.fileDataUrl || payload.zones.length === 0) {
    return { ok: false, message: 'Map name, file, and at least one zone are required.' };
  }

  const normalizedZones = payload.zones.map((zone) => normalizeZone(zone));
  const zoneValidation = await validateZones(normalizedZones);
  if (!zoneValidation.ok) return zoneValidation;

  const id = `${normalize(payload.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
  const docData: MapSet = { ...payload, zones: normalizedZones, id, createdAt: Date.now() };
  await setDoc(doc(db, mapSetsCollection, id), docData);

  const codes = getMapAllCodes(docData);
  const clueIds = getMapAllClueIds(docData);
  if (codes.length > 0) {
    await setDoc(doc(db, mapCodePoolsCollection, id), {
      id,
      name: payload.name,
      fileType: payload.fileType,
      codes,
      clueIds,
      createdAt: Date.now(),
    });
  }

  return { ok: true, message: 'Map set saved.' };
}

export async function updateMapSetApi(payload: Pick<MapSet, 'id' | 'name' | 'fileName' | 'fileType' | 'fileDataUrl' | 'zones' | 'createdAt'>): Promise<{ ok: boolean; message: string }> {
  if (!normalize(payload.id) || !normalize(payload.name) || !payload.fileDataUrl || payload.zones.length === 0) {
    return { ok: false, message: 'Map id, name, file, and at least one zone are required.' };
  }

  const normalizedZones = payload.zones.map((zone) => normalizeZone(zone));
  const zoneValidation = await validateZones(normalizedZones, payload.id);
  if (!zoneValidation.ok) return zoneValidation;

  const docData = { ...payload, zones: normalizedZones };
  await setDoc(doc(db, mapSetsCollection, payload.id), docData);

  const codes = getMapAllCodes(docData);
  const clueIds = getMapAllClueIds(docData);
  await setDoc(doc(db, mapCodePoolsCollection, payload.id), {
    id: payload.id,
    name: payload.name,
    fileType: payload.fileType,
    codes,
    clueIds,
    createdAt: Date.now(),
  });

  return { ok: true, message: 'Map set updated.' };
}

export async function listMapSetsApi(): Promise<MapSet[]> {
  const snap = await getDocs(collection(db, mapSetsCollection));
  return snap.docs
    .map((entry) => mapDocumentToMapSet(entry.data() as Partial<MapSet>, entry.id))
    .filter((entry): entry is MapSet => entry !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRandomMapSelectionApi(excludedMapSetIds: string[] = []): Promise<RandomMapSelection | null> {
  const excluded = new Set(excludedMapSetIds.map((id) => normalize(id)).filter(Boolean));
  const sets = await listMapSetsApi();
  const eligible = sets.filter((set) => !excluded.has(set.id));
  const source = eligible.length > 0 ? eligible : sets;
  const candidatePool = source.length > 1 ? source.filter((set) => set.id !== lastSelectedMapSetId) : source;
  const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)];

  if (!chosen) {
    return null;
  }

  lastSelectedMapSetId = chosen.id;
  return {
    id: chosen.id,
    name: chosen.name,
    fileType: chosen.fileType,
    codes: getMapAllCodes(chosen),
    clueIds: getMapAllClueIds(chosen),
  };
}

export async function getMapSetByIdApi(id: string): Promise<MapSet | null> {
  const snap = await getDoc(doc(db, mapSetsCollection, id));
  if (!snap.exists()) return null;
  return mapDocumentToMapSet(snap.data() as Partial<MapSet>, id);
}

export async function deleteMapSetApi(id: string): Promise<{ ok: boolean; message: string }> {
  const mapId = normalize(id);
  if (!mapId) return { ok: false, message: 'Missing map set id.' };

  await deleteDoc(doc(db, mapSetsCollection, mapId));
  await deleteDoc(doc(db, mapCodePoolsCollection, mapId));
  return { ok: true, message: 'Map set deleted.' };
}
