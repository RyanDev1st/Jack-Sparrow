const palette = [
  '#f58220',
  '#2563eb',
  '#84cc16',
  '#fbbf24',
  '#a855f7',
  '#f472b6',
  '#fb923c',
  '#eab308',
  '#4d7cff',
  '#9fdc2f',
];

const toRgb = (hex: string) => {
  const value = hex.replace('#', '').trim();
  const safe = value.length === 3
    ? value.split('').map((char) => `${char}${char}`).join('')
    : value.padEnd(6, '0').slice(0, 6);
  const intValue = Number.parseInt(safe, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

const colorDistance = (a: string, b: string): number => {
  const A = toRgb(a);
  const B = toRgb(b);
  const dr = A.r - B.r;
  const dg = A.g - B.g;
  const db = A.b - B.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

export const areColorsDistinct = (a: string, b: string, minDistance = 120): boolean => colorDistance(a, b) >= minDistance;

export const ensureDistinctZoneColors = (count: number): string[] => {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const fallback = palette[i % palette.length];
    const candidate = palette.find((color) => out.every((used) => areColorsDistinct(color, used)));
    out.push(candidate ?? fallback);
  }
  return out;
};

export const normalizeZoneColors = (colors: string[]): string[] => {
  const distinct = ensureDistinctZoneColors(colors.length);
  return colors.map((color, index) => {
    const isUniqueEnough = colors.every((other, otherIndex) => otherIndex === index || areColorsDistinct(color, other));
    return isUniqueEnough ? color : distinct[index];
  });
};
