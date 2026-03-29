import { collection, doc, getDoc, getDocs, query, setDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

type Role = 'admin' | 'founder';

export type PasscodeDoc = {
  id: string;
  code: string;
  role: Role;
  label: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

const passcodesCollection = 'passcodes';
const normalize = (value: string) => value.trim();
const isPin = (value: string) => /^\d{4}$/.test(value);

const seedDefaults = async () => {
  const snap = await getDocs(collection(db, passcodesCollection));
  if (!snap.empty) return;
  const now = Date.now();
  const defaults: PasscodeDoc[] = [
    { id: 'admin-default', code: '2026', role: 'admin', label: 'Default Admin', active: true, createdAt: now, updatedAt: now },
    { id: 'founder-default', code: '2401', role: 'founder', label: 'Default Founder', active: true, createdAt: now, updatedAt: now },
  ];
  await Promise.all(defaults.map((entry) => setDoc(doc(db, passcodesCollection, entry.id), entry)));
};

const listPasscodes = async (): Promise<PasscodeDoc[]> => {
  await seedDefaults();
  const snap = await getDocs(collection(db, passcodesCollection));
  return snap.docs
    .map((item) => item.data() as Partial<PasscodeDoc>)
    .filter((item) => typeof item.id === 'string' && typeof item.code === 'string' && (item.role === 'admin' || item.role === 'founder'))
    .map((item) => ({
      id: String(item.id),
      code: String(item.code),
      role: item.role as Role,
      label: String(item.label ?? 'Passcode'),
      active: Boolean(item.active),
      createdAt: Number(item.createdAt ?? 0),
      updatedAt: Number(item.updatedAt ?? 0),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

const verifyFounder = async (founderCode: string): Promise<boolean> => {
  await seedDefaults();
  const input = normalize(founderCode);
  if (!isPin(input)) return false;
  const q = query(collection(db, passcodesCollection), where('role', '==', 'founder'), where('active', '==', true), where('code', '==', input));
  const snap = await getDocs(q);
  return !snap.empty;
};

export async function verifyPasscode(code: string): Promise<{ ok: boolean; role: Role | null; message: string }> {
  await seedDefaults();
  const input = normalize(code);
  if (!isPin(input)) {
    return { ok: false, role: null, message: 'PIN must be 4 digits.' };
  }

  const q = query(collection(db, passcodesCollection), where('active', '==', true), where('code', '==', input));
  const snap = await getDocs(q);
  const match = snap.docs
    .map((entry) => entry.data() as Partial<PasscodeDoc>)
    .find((entry) => entry.role === 'admin' || entry.role === 'founder');

  if (!match || (match.role !== 'admin' && match.role !== 'founder')) {
    return { ok: false, role: null, message: 'Incorrect PIN' };
  }

  return { ok: true, role: match.role, message: 'Access granted.' };
}

export async function listPasscodesSecure(): Promise<PasscodeDoc[]> {
  return listPasscodes();
}

export async function addPasscodeSecure(input: {
  founderCode: string;
  code: string;
  role: Role;
  label: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!(await verifyFounder(input.founderCode))) {
    return { ok: false, message: 'Founder verification failed.' };
  }

  const code = normalize(input.code);
  const label = normalize(input.label);
  if (!isPin(code)) return { ok: false, message: 'PIN must be 4 digits.' };
  if (!label) return { ok: false, message: 'Label is required.' };

  const existing = await listPasscodes();
  if (existing.some((entry) => entry.code === code && entry.active)) {
    return { ok: false, message: 'A passcode with this PIN already exists.' };
  }

  const id = `pc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();
  await setDoc(doc(db, passcodesCollection, id), {
    id,
    code,
    role: input.role,
    label,
    active: true,
    createdAt: now,
    updatedAt: now,
  } satisfies PasscodeDoc);

  return { ok: true, message: 'Passcode added.' };
}

export async function updatePasscodeSecure(input: {
  founderCode: string;
  id: string;
  code?: string;
  role?: Role;
  label?: string;
  active?: boolean;
}): Promise<{ ok: boolean; message: string }> {
  if (!(await verifyFounder(input.founderCode))) {
    return { ok: false, message: 'Founder verification failed.' };
  }

  const id = normalize(input.id);
  if (!id) return { ok: false, message: 'Missing passcode id.' };

  const ref = doc(db, passcodesCollection, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, message: 'Passcode not found.' };

  const current = snap.data() as Partial<PasscodeDoc>;
  const nextCode = input.code === undefined ? String(current.code ?? '') : normalize(input.code);
  if (!isPin(nextCode)) return { ok: false, message: 'PIN must be 4 digits.' };

  const all = await listPasscodes();
  if (all.some((entry) => entry.id !== id && entry.active && entry.code === nextCode)) {
    return { ok: false, message: 'Another active passcode already uses this PIN.' };
  }

  const nextRole = input.role ?? (current.role === 'founder' ? 'founder' : 'admin');
  const nextLabel = input.label === undefined ? String(current.label ?? 'Passcode') : normalize(input.label);
  const nextActive = input.active ?? Boolean(current.active);

  await setDoc(ref, {
    id,
    code: nextCode,
    role: nextRole,
    label: nextLabel || 'Passcode',
    active: nextActive,
    createdAt: Number(current.createdAt ?? Date.now()),
    updatedAt: Date.now(),
  } satisfies PasscodeDoc);

  return { ok: true, message: 'Passcode updated.' };
}

export async function deletePasscodeSecure(input: {
  founderCode: string;
  id: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!(await verifyFounder(input.founderCode))) {
    return { ok: false, message: 'Founder verification failed.' };
  }

  const id = normalize(input.id);
  if (!id) return { ok: false, message: 'Missing passcode id.' };
  await deleteDoc(doc(db, passcodesCollection, id));
  return { ok: true, message: 'Passcode deleted.' };
}
