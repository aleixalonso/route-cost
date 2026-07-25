export interface CalculateFuelCostInput {
  distanceKm: number;
  litresPer100Km: number;
  pricePerLitre: number;
}

export interface FuelCostEstimate {
  litresConsumed: number;
  estimatedCost: number;
}

export function calculateFuelCost(
  input: CalculateFuelCostInput,
): FuelCostEstimate {
  assertNonNegativeFinite(input.distanceKm, 'distanceKm');
  assertNonNegativeFinite(input.litresPer100Km, 'litresPer100Km');
  assertNonNegativeFinite(input.pricePerLitre, 'pricePerLitre');

  const litresConsumed = (input.distanceKm * input.litresPer100Km) / 100;

  return {
    litresConsumed,
    estimatedCost: litresConsumed * input.pricePerLitre,
  };
}

function assertNonNegativeFinite(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative finite number`);
  }
}
