import { collection, doc, getDoc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { generateMantraPhrase, extractMantraCode, generateMantraToken, normalize, normalizeLocationCode, parseHunter, type HunterDoc } from './mantraHelpers';

const huntersCollection = 'hunters';

const findBySessionId = async (identifier: string) => {
  const snap = await getDoc(doc(db, huntersCollection, identifier));
  if (!snap.exists()) return null;
  const hunter = parseHunter(snap.data(), snap.id);
  return hunter ? { ref: snap.ref, hunter } : null;
};

const findByMantraId = async (identifier: string) => {
  const q = query(collection(db, huntersCollection), where('mantra_id', '==', identifier), limit(1));
  const snap = await getDocs(q);
  const match = snap.docs[0];
  if (!match) return null;
  const hunter = parseHunter(match.data(), match.id);
  return hunter ? { ref: match.ref, hunter } : null;
};

const findByMantraCode = async (identifier: string) => {
  const code = identifier.trim().toUpperCase();
  if (!code) return null;
  const q = query(collection(db, huntersCollection), where('mantra_code', '==', code), limit(1));
  const snap = await getDocs(q);
  const match = snap.docs[0];
  if (!match) return null;
  const hunter = parseHunter(match.data(), match.id);
  return hunter ? { ref: match.ref, hunter } : null;
};

export async function findHunterByIdentifier(identifierRaw: string): Promise<{ hunter: HunterDoc | null; refId: string | null }> {
  const identifier = normalize(identifierRaw);
  if (!identifier) return { hunter: null, refId: null };

  const bySession = await findBySessionId(identifier);
  if (bySession) return { hunter: bySession.hunter, refId: bySession.ref.id };

  const byMantra = await findByMantraId(identifier);
  if (byMantra) return { hunter: byMantra.hunter, refId: byMantra.ref.id };

  const byCode = await findByMantraCode(identifier);
  if (byCode) return { hunter: byCode.hunter, refId: byCode.ref.id };

  return { hunter: null, refId: null };
}

const ensureUniqueMantra = (taken: Set<string>) => {
  for (let i = 0; i < 200; i += 1) {
    const phrase = generateMantraPhrase();
    const token = generateMantraToken();
    const candidate = `${phrase} #${token}`;
    if (!taken.has(candidate)) return candidate;
  }

  const fallbackToken = generateMantraToken();
  return `${generateMantraPhrase()} #${fallbackToken}`;
};

export const createSessionId = (): string => `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const uniqueCodes = (values: string[]): string[] => Array.from(new Set(values.map((value) => normalizeLocationCode(value)).filter(Boolean)));

export async function listTakenMantras(): Promise<Set<string>> {
  const snap = await getDocs(collection(db, huntersCollection));
  return new Set(
    snap.docs
      .map((entry) => parseHunter(entry.data(), entry.id))
      .filter((hunter): hunter is HunterDoc => Boolean(hunter))
      .map((hunter) => hunter.mantra_id),
  );
}

export const nextUniqueMantra = (taken: Set<string>): { mantra_id: string; mantra_code: string } => {
  const mantra_id = ensureUniqueMantra(taken);
  const basePhrase = mantra_id.replace(/\s+#([A-Z0-9]{4})$/, '').trim();
  const suffix = mantra_id.match(/#([A-Z0-9]{4})$/)?.[1] ?? generateMantraToken();
  const mantra_code = `${extractMantraCode(basePhrase)}-${suffix}`;
  taken.add(mantra_id);
  return { mantra_id, mantra_code };
};

export async function autoHealDuplicateMantras(): Promise<{ healed: number }> {
  const snap = await getDocs(collection(db, huntersCollection));
  const items = snap.docs
    .map((entry) => ({ ref: entry.ref, hunter: parseHunter(entry.data(), entry.id) }))
    .filter((entry): entry is { ref: typeof snap.docs[number]['ref']; hunter: HunterDoc } => Boolean(entry.hunter));

  const byMantra = new Map<string, Array<{ ref: typeof snap.docs[number]['ref']; hunter: HunterDoc }>>();
  const taken = new Set<string>();
  items.forEach((entry) => {
    taken.add(entry.hunter.mantra_id);
    const group = byMantra.get(entry.hunter.mantra_id) ?? [];
    group.push(entry);
    byMantra.set(entry.hunter.mantra_id, group);
  });

  let healed = 0;
  await Promise.all(
    Array.from(byMantra.values()).flatMap((group) =>
      group.slice(1).map(async (entry) => {
        const { mantra_id, mantra_code } = nextUniqueMantra(taken);
        await updateDoc(entry.ref, { mantra_id, mantra_code });
        healed += 1;
      }),
    ),
  );

  return { healed };
}

export async function deleteIdleMantras(): Promise<{ deleted: number }> {
  const snap = await getDocs(collection(db, huntersCollection));
  const items = snap.docs
    .map((entry) => ({ ref: entry.ref, hunter: parseHunter(entry.data(), entry.id) }))
    .filter((entry): entry is { ref: typeof snap.docs[number]['ref']; hunter: HunterDoc } => Boolean(entry.hunter));

  const toDelete = items.filter((item) => {
    const isIdle = item.hunter.status === 'HUNTING' && item.hunter.scanned_nodes.length === 0;
    const isStale = Date.now() - parseInt(item.hunter.session_id.split('-')[1] ?? '0', 36) > 86400000;
    return isIdle && isStale;
  });

  let deleted = 0;
  await Promise.all(
    toDelete.map(async (item) => {
      await updateDoc(item.ref, { status: 'ABANDONED' });
      deleted += 1;
    }),
  );

  return { deleted };
}
