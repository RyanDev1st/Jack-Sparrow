type Status = 'HUNTING' | 'FINISHED' | 'CLAIMED';

export type HunterDoc = {
  session_id: string;
  mantra_id: string;
  mantra_code: string;
  assigned_map: string[];
  assigned_clue_ids?: string[];
  scanned_nodes: string[];
  status: Status;
  map_set_id?: string;
  completed_map_sets?: string[];
};

export type PublicHunter = {
  session_id: string;
  mantra_id: string;
  mantra_code: string;
  status: Status;
  assigned_count: number;
  scanned_count: number;
  map_set_id?: string;
  assigned_clue_ids?: string[];
};

const actions = ['Seek', 'Awaken', 'Channel', 'Summon', 'Hear', 'Unveil', 'Claim', 'Capture', 'Unlock', 'Discover'] as const;
const descriptors = ['Abyssal', 'Astral', 'Sunken', 'Silent', 'Cosmic', 'Hidden', 'Sacred', 'Ancient', 'Eternal', 'Mystic'] as const;
const domains = ['Nebula', 'Tide', 'Void', 'Ocean', 'Reef', 'Chamber', 'Temple', 'Abyss', 'Realm', 'Gate'] as const;
const prepositions = ['Beyond', 'Beneath', 'Within', 'Across', 'Through', 'Above', 'Below', 'Along', 'Past', 'Near'] as const;
const anchors = ['Stars', 'Waves', 'Shadows', 'Time', 'Light', 'Stones', 'Echoes', 'Dreams', 'Flames', 'Essence'] as const;

const pick = <T extends readonly string[]>(values: T): string => values[Math.floor(Math.random() * values.length)];

export const normalize = (value: string): string => value.trim();

export const normalizeLocationCode = (value: string): string => value.trim();

export const generateMantraPhrase = (): string => {
  const action = pick(actions);
  const descriptor = pick(descriptors);
  const domain = pick(domains);
  const preposition = pick(prepositions);
  const anchor = pick(anchors);
  return `${action} ${descriptor} ${domain} ${preposition} ${anchor}`;
};

export const extractMantraCode = (phrase: string): string => {
  return phrase
    .trim()
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
    .padEnd(3, 'X')
    .substring(0, 3);
};

export const generateMantraToken = (): string => Math.random().toString(36).slice(2, 6).toUpperCase();

export const toPublicHunter = (hunter: HunterDoc): PublicHunter => ({
  session_id: hunter.session_id,
  mantra_id: hunter.mantra_id,
  mantra_code: hunter.mantra_code,
  status: hunter.status,
  assigned_count: hunter.assigned_map.length,
  scanned_count: hunter.scanned_nodes.length,
  map_set_id: hunter.map_set_id,
  assigned_clue_ids: Array.isArray(hunter.assigned_clue_ids) ? hunter.assigned_clue_ids : [],
});

export const parseHunter = (raw: unknown, fallbackSessionId: string): HunterDoc | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<HunterDoc>;
  if (!Array.isArray(data.assigned_map) || !Array.isArray(data.scanned_nodes)) return null;
  if (data.status !== 'HUNTING' && data.status !== 'FINISHED' && data.status !== 'CLAIMED') return null;

  const sessionId = data.session_id ? String(data.session_id) : fallbackSessionId;
  const mantraId = data.mantra_id ? String(data.mantra_id) : fallbackSessionId;
  const mantraCode = data.mantra_code ? String(data.mantra_code) : extractMantraCode(mantraId);

  return {
    session_id: sessionId,
    mantra_id: mantraId,
    mantra_code: mantraCode,
    assigned_map: Array.from(new Set(data.assigned_map.map(String).map(normalizeLocationCode))).filter(Boolean),
    assigned_clue_ids: Array.isArray(data.assigned_clue_ids)
      ? Array.from(new Set(data.assigned_clue_ids.map(String).map(normalize))).filter(Boolean)
      : [],
    scanned_nodes: Array.from(new Set(data.scanned_nodes.map(String).map(normalizeLocationCode))).filter(Boolean),
    status: data.status,
    map_set_id: data.map_set_id ? String(data.map_set_id) : undefined,
    completed_map_sets: Array.isArray(data.completed_map_sets) ? data.completed_map_sets.map(String) : [],
  };
}
