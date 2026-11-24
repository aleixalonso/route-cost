export function parseSpainCoordinate(
  value: unknown,
  type: 'lat' | 'lon',
): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (!/^-?\d+(?:,\d+)?$/.test(trimmed)) {
    return undefined;
  }

  const parsed = Number(trimmed.replace(',', '.'));

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (type === 'lat' && parsed >= -90 && parsed <= 90) {
    return parsed;
  }

  if (type === 'lon' && parsed >= -180 && parsed <= 180) {
    return parsed;
  }

  return undefined;
}
