import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { normalize, normalizeLocationCode, parseHunter, toPublicHunter, type PublicHunter } from './mantraHelpers';
import {
  autoHealDuplicateMantras,
  createSessionId,
  findHunterByIdentifier,
  listTakenMantras,
  nextUniqueMantra,
  uniqueCodes,
} from './mantraStore';
import { getZoneLocations, getZoneRouteSets, listMapSetsApi, type MapSet } from '../mapSetApi';

const huntersCollection = 'hunters';
let lastSelectedMapSetId = '';
type Status = 'HUNTING' | 'FINISHED' | 'CLAIMED';

export { findHunterByIdentifier, autoHealDuplicateMantras };

export type ValidateResult = PublicHunter & {
  ok: boolean;
  message: string;
  scanned_nodes?: string[];
};

const chooseRandom = <T,>(values: T[]): T | null => {
  if (values.length === 0) return null;
  return values[Math.floor(Math.random() * values.length)] ?? null;
};

const buildAssignedSelection = (map: MapSet): { codes: string[]; clueIds: string[] } => {
  const codes: string[] = [];
  const clueIds: string[] = [];

  map.zones.forEach((zone) => {
    const locations = getZoneLocations(zone);
    const routeSets = getZoneRouteSets(zone);
    const chosenRouteSet = chooseRandom(routeSets) ?? null;
    const activeLocationIds = chosenRouteSet ? new Set(chosenRouteSet.locationIds) : null;
    const activeLocations = activeLocationIds
      ? locations.filter((location) => activeLocationIds.has(location.id))
      : locations;

    activeLocations.forEach((location) => {
      if (location.locationCode) codes.push(location.locationCode);
      if (location.id) clueIds.push(location.id);
    });
  });

  return {
    codes: uniqueCodes(codes),
    clueIds: Array.from(new Set(clueIds)).filter(Boolean),
  };
};

export async function generateHunter(params: {
  excludedMapSetIds?: string[];
  completedMapSetIds?: string[];
  maxAttempts?: number;
}): Promise<{ ok: boolean; message: string; hunter: PublicHunter | null }> {
  await autoHealDuplicateMantras();
  const excluded = new Set((params.excludedMapSetIds ?? []).map(normalize).filter(Boolean));
  const completed = (params.completedMapSetIds ?? []).map(normalize).filter(Boolean);

  const maps = await listMapSetsApi();
  const pools = maps
    .map((map) => {
      const selection = buildAssignedSelection(map);
      return {
        id: normalize(String(map.id ?? '')),
        codes: selection.codes,
        clueIds: selection.clueIds,
      };
    })
    .filter((entry) => entry.id && entry.codes.length > 0);

  const eligible = pools.filter((entry) => !excluded.has(entry.id));
  const source = eligible.length > 0 ? eligible : pools;
  const candidatePool = source.length > 1 ? source.filter((entry) => entry.id !== lastSelectedMapSetId) : source;
  const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)];
  if (!chosen) return { ok: false, message: 'No map sets configured.', hunter: null };

  lastSelectedMapSetId = chosen.id;
  const attempts = Math.max(10, params.maxAttempts ?? 40);
  const takenMantras = await listTakenMantras();

  for (let i = 0; i < attempts; i += 1) {
    const sessionId = createSessionId();
    const ref = doc(db, huntersCollection, sessionId);
    if ((await getDoc(ref)).exists()) continue;

    const { mantra_id, mantra_code } = nextUniqueMantra(takenMantras);
    const hunter = {
      session_id: sessionId,
      mantra_id,
      mantra_code,
      assigned_map: uniqueCodes(chosen.codes),
      assigned_clue_ids: Array.from(new Set(chosen.clueIds)).filter(Boolean),
      scanned_nodes: [] as string[],
      status: 'HUNTING' as Status,
      map_set_id: chosen.id,
      completed_map_sets: completed,
    };

    await setDoc(ref, hunter);
    return { ok: true, message: 'Mantra generated.', hunter: toPublicHunter(hunter) };
  }

  return { ok: false, message: 'Unable to allocate a unique mantra right now.', hunter: null };
}

export async function lookupHunter(identifierRaw: string): Promise<{ ok: boolean; message: string; hunter: PublicHunter | null }> {
  const identifier = normalize(identifierRaw);
  if (!identifier) return { ok: false, message: 'Missing mantra_id/session_id.', hunter: null };

  const found = await findHunterByIdentifier(identifier);
  if (!found.hunter) return { ok: false, message: 'INVALID / NOT FOUND', hunter: null };
  return { ok: true, message: 'Hunter loaded.', hunter: toPublicHunter(found.hunter) };
}

export async function validateNode(input: { mantra_id?: string; session_id?: string; scanned_payload: string }): Promise<ValidateResult> {
  const identifier = normalize(input.session_id ?? input.mantra_id ?? '');
  const payload = normalizeLocationCode(input.scanned_payload);
  if (!identifier || !payload) {
    return { ok: false, message: 'Missing session_id/mantra_id or scanned_payload.', session_id: identifier, mantra_id: '', mantra_code: '', status: 'HUNTING', scanned_count: 0, assigned_count: 0 };
  }

  const found = await findHunterByIdentifier(identifier);
  if (!found.refId) {
    return { ok: false, message: 'INVALID / NOT FOUND', session_id: identifier, mantra_id: identifier, mantra_code: '', status: 'HUNTING', scanned_count: 0, assigned_count: 0 };
  }

  const ref = doc(db, huntersCollection, found.refId);
  let result: ValidateResult = {
    ok: false,
    message: 'INVALID / NOT FOUND',
    session_id: found.hunter?.session_id ?? found.refId,
    mantra_id: found.hunter?.mantra_id ?? identifier,
    mantra_code: found.hunter?.mantra_code ?? '',
    status: 'HUNTING',
    scanned_count: 0,
    assigned_count: 0,
  };

  await runTransaction(db, async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists()) return;
    const hunter = parseHunter(snap.data(), ref.id);
    if (!hunter) return;

    if (hunter.assigned_map.length === 0) {
      result = { ...toPublicHunter(hunter), ok: false, message: 'This session has no assigned location codes.', scanned_nodes: hunter.scanned_nodes };
      return;
    }
    if (!hunter.assigned_map.includes(payload)) {
      result = { ...toPublicHunter(hunter), ok: false, message: 'Scanned payload is not assigned to this hunter.', scanned_nodes: hunter.scanned_nodes };
      return;
    }
    if (hunter.scanned_nodes.includes(payload)) {
      result = { ...toPublicHunter(hunter), ok: false, message: 'Scanned payload already recorded.', scanned_nodes: hunter.scanned_nodes };
      return;
    }

    txn.update(ref, { scanned_nodes: arrayUnion(payload) });
    const nextScannedCount = hunter.scanned_nodes.length + 1;
    const shouldFinish = hunter.status === 'HUNTING' && nextScannedCount === hunter.assigned_map.length;
    if (shouldFinish) txn.update(ref, { status: 'FINISHED' });

    result = {
      ok: true,
      message: 'Node validated and recorded.',
      session_id: hunter.session_id,
      mantra_id: hunter.mantra_id,
      mantra_code: hunter.mantra_code,
      status: shouldFinish ? 'FINISHED' : hunter.status,
      scanned_count: nextScannedCount,
      assigned_count: hunter.assigned_map.length,
      map_set_id: hunter.map_set_id,
      assigned_clue_ids: hunter.assigned_clue_ids,
      scanned_nodes: [...hunter.scanned_nodes, payload],
    };
  });

  return result;
}

export async function finalizeClaim(identifierRaw: string): Promise<{ ok: boolean; message: string; hunter: PublicHunter | null }> {
  const found = await findHunterByIdentifier(identifierRaw);
  if (!found.refId || !found.hunter) return { ok: false, message: 'INVALID / NOT FOUND', hunter: null };
  if (found.hunter.status === 'CLAIMED') return { ok: false, message: 'ALREADY CLAIMED', hunter: toPublicHunter(found.hunter) };
  if (found.hunter.status !== 'FINISHED') return { ok: false, message: 'Hunter is not ready to claim.', hunter: toPublicHunter(found.hunter) };

  await updateDoc(doc(db, huntersCollection, found.refId), { status: 'CLAIMED' });
  return { ok: true, message: 'Claim finalized.', hunter: { ...toPublicHunter(found.hunter), status: 'CLAIMED' } };
}

export async function deleteMantra(identifierRaw: string): Promise<{ ok: boolean; message: string }> {
  const found = await findHunterByIdentifier(identifierRaw);
  if (!found.refId) return { ok: true, message: 'Session already cleared.' };
  await deleteDoc(doc(db, huntersCollection, found.refId));
  return { ok: true, message: 'Mantra deleted.' };
}

export async function nukeAllMantras(): Promise<{ ok: boolean; message: string; deletedCount: number }> {
  const snap = await getDocs(collection(db, huntersCollection));
  if (snap.empty) return { ok: true, message: 'No mantras to delete.', deletedCount: 0 };

  const batch = writeBatch(db);
  snap.docs.forEach((entry) => batch.delete(entry.ref));
  await batch.commit();
  return { ok: true, message: `Deleted ${snap.size} mantras.`, deletedCount: snap.size };
}

export async function listActiveMantras(): Promise<Array<{ session_id: string; mantra_id: string; status: Status; scanned_count: number; assigned_count: number }>> {
  await autoHealDuplicateMantras();
  const snap = await getDocs(collection(db, huntersCollection));
  return snap.docs
    .map((entry) => parseHunter(entry.data(), entry.id))
    .filter((hunter): hunter is NonNullable<typeof hunter> => hunter !== null)
    .map((hunter) => ({
      session_id: hunter.session_id,
      mantra_id: hunter.mantra_id,
      status: hunter.status,
      scanned_count: hunter.scanned_nodes.length,
      assigned_count: hunter.assigned_map.length,
    }))
    .sort((a, b) => a.mantra_id.localeCompare(b.mantra_id));
}
