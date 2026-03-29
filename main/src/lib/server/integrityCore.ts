import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getMapAllClueIds, getMapAllCodes, type MapSet } from '../mapSetApi';
import { normalize } from './mantraHelpers';

const mapSetsCollection = 'map_sets';
const mapCodePoolsCollection = 'map_code_pools';

type DuplicateIssue = {
  code: string;
  mapIds: string[];
};

export type IntegrityReport = {
  ok: boolean;
  duplicateCodesWithinMap: Array<{ mapId: string; duplicates: string[] }>;
  duplicateCodesAcrossMaps: DuplicateIssue[];
  missingCodes: Array<{ mapId: string; zoneId: string }>;
  poolMismatches: Array<{ mapId: string; expectedCount: number; actualCount: number }>;
  message: string;
};

const getMaps = async (): Promise<MapSet[]> => {
  const snap = await getDocs(collection(db, mapSetsCollection));
  return snap.docs
    .map((d) => d.data() as Partial<MapSet>)
    .filter((m) => typeof m.id === 'string' && Array.isArray(m.zones))
    .map((m) => ({
      id: String(m.id),
      name: String(m.name ?? 'Untitled'),
      fileName: String(m.fileName ?? ''),
      fileType: String(m.fileType ?? ''),
      fileDataUrl: String(m.fileDataUrl ?? ''),
      zones: (m.zones ?? []).map((zone: any) => ({
        id: String(zone?.id ?? ''),
        x: Number(zone?.x ?? 0),
        y: Number(zone?.y ?? 0),
        radius: Number(zone?.radius ?? 4),
        radiusX: Number(zone?.radiusX ?? zone?.radius ?? 4),
        radiusY: Number(zone?.radiusY ?? zone?.radius ?? 4),
        rotation: Number(zone?.rotation ?? 0),
        shape: zone?.shape === 'oval' ? 'oval' : 'circle',
        color: String(zone?.color ?? '#f58220'),
        name: String(zone?.name ?? ''),
        locationCode: String(zone?.locationCode ?? ''),
        description: String(zone?.description ?? ''),
        riddle: String(zone?.riddle ?? ''),
        locations: Array.isArray(zone?.locations) ? zone.locations : [],
        routeSets: Array.isArray(zone?.routeSets) ? zone.routeSets : [],
      })),
      createdAt: Number(m.createdAt ?? 0),
    }));
};

const toPoolCodes = (map: MapSet) => getMapAllCodes(map).map((code) => normalize(code)).filter(Boolean);

export async function runIntegrityAudit(): Promise<IntegrityReport> {
  const maps = await getMaps();
  const duplicateCodesWithinMap: Array<{ mapId: string; duplicates: string[] }> = [];
  const missingCodes: Array<{ mapId: string; zoneId: string }> = [];
  const codeToMaps = new Map<string, Set<string>>();

  maps.forEach((map) => {
    const counts = new Map<string, number>();
    toPoolCodes(map).forEach((code) => {
      if (!code) {
        missingCodes.push({ mapId: map.id, zoneId: map.id });
        return;
      }

      counts.set(code, (counts.get(code) ?? 0) + 1);
      const byCode = codeToMaps.get(code) ?? new Set<string>();
      byCode.add(map.id);
      codeToMaps.set(code, byCode);
    });

    map.zones.forEach((zone) => {
      if (toPoolCodes({ ...map, zones: [zone] }).length === 0) {
        missingCodes.push({ mapId: map.id, zoneId: zone.id });
      }
    });

    const localDupes = Array.from(counts.entries()).filter((entry) => entry[1] > 1).map((entry) => entry[0]);
    if (localDupes.length > 0) {
      duplicateCodesWithinMap.push({ mapId: map.id, duplicates: localDupes });
    }
  });

  const duplicateCodesAcrossMaps: DuplicateIssue[] = Array.from(codeToMaps.entries())
    .filter((entry) => entry[1].size > 1)
    .map((entry) => ({ code: entry[0], mapIds: Array.from(entry[1].values()) }));

  const poolSnap = await getDocs(collection(db, mapCodePoolsCollection));
  const poolMap = new Map<string, string[]>();
  poolSnap.docs.forEach((pool) => {
    const data = pool.data() as { id?: unknown; codes?: unknown };
    const id = normalize(String(data.id ?? pool.id));
    const codes = Array.isArray(data.codes) ? data.codes.map((code) => normalize(String(code))).filter(Boolean) : [];
    if (id) poolMap.set(id, codes);
  });

  const poolMismatches: Array<{ mapId: string; expectedCount: number; actualCount: number }> = [];
  maps.forEach((map) => {
    const expectedCodes = toPoolCodes(map);
    const actualCodes = poolMap.get(map.id) ?? [];
    if (expectedCodes.length !== actualCodes.length) {
      poolMismatches.push({ mapId: map.id, expectedCount: expectedCodes.length, actualCount: actualCodes.length });
      return;
    }

    const expectedSet = new Set(expectedCodes);
    const actualSet = new Set(actualCodes);
    const mismatch = expectedCodes.some((code) => !actualSet.has(code)) || actualCodes.some((code) => !expectedSet.has(code));
    if (mismatch) {
      poolMismatches.push({ mapId: map.id, expectedCount: expectedCodes.length, actualCount: actualCodes.length });
    }
  });

  const hasIssues = duplicateCodesWithinMap.length > 0 || duplicateCodesAcrossMaps.length > 0 || missingCodes.length > 0 || poolMismatches.length > 0;
  return {
    ok: !hasIssues,
    duplicateCodesWithinMap,
    duplicateCodesAcrossMaps,
    missingCodes,
    poolMismatches,
    message: hasIssues ? 'Integrity issues detected.' : 'Integrity check passed.',
  };
}

export async function repairPoolMismatches(): Promise<{ ok: boolean; updated: number; message: string }> {
  const maps = await getMaps();
  let updated = 0;

  await Promise.all(
    maps.map(async (map) => {
      const codes = toPoolCodes(map);
      const clueIds = getMapAllClueIds(map);
      await setDoc(doc(db, mapCodePoolsCollection, map.id), {
        id: map.id,
        name: map.name,
        fileType: map.fileType,
        codes,
        clueIds,
        createdAt: Date.now(),
      });
      updated += 1;
    }),
  );

  return { ok: true, updated, message: `Rebuilt ${updated} map code pools.` };
}
