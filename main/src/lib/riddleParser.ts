import type { Zone } from './mapSetApi';

export type RiddleSegment = {
  type: 'text' | 'variable';
  content: string;
  color?: string;
};

const normalizeKey = (value: string): string => value.toLowerCase().trim();

const toHex = (hex: string): { r: number; g: number; b: number } => {
  const safe = hex.replace('#', '').trim();
  const normalized = safe.length === 3
    ? safe.split('').map((c) => `${c}${c}`).join('')
    : safe.padEnd(6, '0').slice(0, 6);
  const intValue = Number.parseInt(normalized, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

const colorAliasFromHex = (hex: string): string => {
  const rgb = toHex(hex);
  const named = [
    { name: 'orange', r: 245, g: 130, b: 32 },
    { name: 'blue', r: 37, g: 99, b: 235 },
    { name: 'green', r: 132, g: 204, b: 22 },
    { name: 'yellow', r: 251, g: 191, b: 36 },
    { name: 'pink', r: 244, g: 114, b: 182 },
    { name: 'purple', r: 168, g: 85, b: 247 },
  ];

  let selected = named[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  named.forEach((candidate) => {
    const dr = rgb.r - candidate.r;
    const dg = rgb.g - candidate.g;
    const db = rgb.b - candidate.b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      selected = candidate;
    }
  });

  return selected.name;
};

export const parseRiddleWithVariables = (riddleText: string, zones: Zone[]): RiddleSegment[] => {
  const segments: RiddleSegment[] = [];
  const zonesByName = new Map<string, string>();
  zones.forEach((zone) => {
    const zoneColor = zone.color;
    const keys = [zone.name, zone.locationCode, colorAliasFromHex(zone.color)];
    keys
      .map((key) => normalizeKey(String(key ?? '')))
      .filter(Boolean)
      .forEach((key) => zonesByName.set(key, zoneColor));
  });

  let lastIndex = 0;
  const variableRegex = /\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = variableRegex.exec(riddleText)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: riddleText.substring(lastIndex, match.index),
      });
    }

    const varName = normalizeKey(match[1] ?? '');
    const zoneColor = zonesByName.get(varName);

    segments.push({
      type: 'variable',
      content: match[1] ?? '',
      color: zoneColor,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < riddleText.length) {
    segments.push({
      type: 'text',
      content: riddleText.substring(lastIndex),
    });
  }

  return segments.length > 0
    ? segments
    : [{ type: 'text', content: riddleText }];
};

export const riddleToPlainText = (segments: RiddleSegment[]): string => {
  return segments.map((seg) => seg.content).join('');
};
