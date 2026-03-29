import type { Zone } from './mapSetApi';

const LEGACY_PIXEL_RADIUS_THRESHOLD = 16;
const LEGACY_BASE_SIZE = 720;
const DEFAULT_ZONE_COLOR = '#f58220';
const NAMED_ZONE_COLORS: Record<string, string> = {
  orange: '#f58220',
  blue: '#3ba7ff',
  yellow: '#f6c945',
  green: '#57d27f',
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const normalizeAxis = (value: number): number => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return 50;
  // Legacy maps may store axis in 0..1 range.
  if (numeric >= 0 && numeric <= 1) return clampPercent(numeric * 100);
  // Legacy maps may store axis in pixel space (commonly based on ~720 reference width).
  if (numeric > 100) return clampPercent((numeric / LEGACY_BASE_SIZE) * 100);
  const normalized = numeric;
  return clampPercent(normalized);
};

const normalizeRadiusInput = (value: number): number => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return 5.2;
  // Legacy maps may store tiny decimal radius (e.g. 0.052 for 5.2%).
  if (numeric > 0 && numeric <= 1) return numeric * 100;
  return numeric;
};

const normalizeColor = (value: unknown): string => {
  if (typeof value !== 'string') return DEFAULT_ZONE_COLOR;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_ZONE_COLOR;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return trimmed;
  const named = NAMED_ZONE_COLORS[trimmed.toLowerCase()];
  if (named) return named;
  return DEFAULT_ZONE_COLOR;
};

const normalizeShape = (value: unknown): 'circle' | 'oval' => (value === 'oval' ? 'oval' : 'circle');

const normalizeRotation = (value: unknown): number => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return 0;
  return Math.max(-180, Math.min(180, numeric));
};

export const radiusToPercent = (radius: number): number => {
  if (!Number.isFinite(radius)) return 4;
  if (radius > LEGACY_PIXEL_RADIUS_THRESHOLD) {
    return clampPercent((radius / LEGACY_BASE_SIZE) * 100);
  }
  return clampPercent(radius);
};

export const percentToRadius = (radiusPercent: number): number => {
  const safe = clampPercent(radiusPercent);
  return Number(safe.toFixed(2));
};

export const normalizeZone = (zone: Zone): Zone => ({
  ...zone,
  x: normalizeAxis(zone.x),
  y: normalizeAxis(zone.y),
  shape: normalizeShape(zone.shape),
  radius: percentToRadius(radiusToPercent(normalizeRadiusInput(zone.radius))),
  radiusX: percentToRadius(radiusToPercent(normalizeRadiusInput(zone.radiusX ?? zone.radius))),
  radiusY: percentToRadius(radiusToPercent(normalizeRadiusInput(zone.radiusY ?? zone.radius))),
  rotation: normalizeRotation(zone.rotation),
  color: normalizeColor((zone as Zone).color),
  locationCode: String(zone.locationCode ?? '').trim(),
  description: String(zone.description ?? '').trim(),
  riddle: String(zone.riddle ?? '').trim(),
  locations: Array.isArray(zone.locations)
    ? zone.locations.map((location, index) => ({
        id: String(location.id ?? `${zone.id}-loc-${index + 1}`).trim(),
        name: String(location.name ?? `${zone.name || 'Location'} ${index + 1}`).trim(),
        locationCode: String(location.locationCode ?? '').trim(),
        description: String(location.description ?? '').trim(),
        riddle: String(location.riddle ?? '').trim(),
      }))
    : undefined,
  routeSets: Array.isArray(zone.routeSets)
    ? zone.routeSets.map((routeSet, index) => ({
        id: String(routeSet.id ?? `${zone.id}-set-${index + 1}`).trim(),
        name: String(routeSet.name ?? `Set ${index + 1}`).trim(),
        locationIds: Array.from(new Set((routeSet.locationIds ?? []).map((value) => String(value).trim()).filter(Boolean))),
      }))
    : undefined,
});
