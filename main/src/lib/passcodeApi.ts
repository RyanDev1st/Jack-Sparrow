type Role = 'admin' | 'founder';

export type PasscodeEntry = {
  id: string;
  code: string;
  role: Role;
  label: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  return (await response.json()) as T;
};

export async function listPasscodesApi(): Promise<PasscodeEntry[]> {
  const result = await fetchJson<{ ok: boolean; items: PasscodeEntry[]; message: string }>('/api/passcodes/list', { method: 'GET' });
  return result.ok && Array.isArray(result.items) ? result.items : [];
}

export async function verifyPasscodeApi(code: string): Promise<{ ok: boolean; role: Role | null; message: string }> {
  return fetchJson<{ ok: boolean; role: Role | null; message: string }>('/api/passcodes/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function addPasscodeApi(
  founderCode: string,
  code: string,
  role: Role,
  label: string,
): Promise<{ ok: boolean; message: string }> {
  return fetchJson<{ ok: boolean; message: string }>('/api/passcodes/add', {
    method: 'POST',
    body: JSON.stringify({ founderCode, code, role, label }),
  });
}

export async function updatePasscodeApi(
  founderCode: string,
  id: string,
  next: Partial<Pick<PasscodeEntry, 'code' | 'role' | 'label' | 'active'>>,
): Promise<{ ok: boolean; message: string }> {
  return fetchJson<{ ok: boolean; message: string }>('/api/passcodes/update', {
    method: 'POST',
    body: JSON.stringify({ founderCode, id, ...next }),
  });
}

export async function deletePasscodeApi(founderCode: string, id: string): Promise<{ ok: boolean; message: string }> {
  return fetchJson<{ ok: boolean; message: string }>('/api/passcodes/delete', {
    method: 'POST',
    body: JSON.stringify({ founderCode, id }),
  });
}

export async function establishAdminSessionApi(pin: string): Promise<{ ok: boolean; message: string }> {
  return fetchJson<{ ok: boolean; message: string }>('/api/admin/session', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export async function clearAdminSessionApi(): Promise<{ ok: boolean; message: string }> {
  return fetchJson<{ ok: boolean; message: string }>('/api/admin/session', {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}
