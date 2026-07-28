export const maxSpainFuelPricePerLitre = 10;

export function parseSpainDecimal(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || !/^\d+(?:,\d+)?$/.test(trimmed)) {
    return undefined;
  }

  const parsed = Number(trimmed.replace(',', '.'));

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0 ||
    parsed > maxSpainFuelPricePerLitre
  ) {
    return undefined;
  }

  return parsed;
}
