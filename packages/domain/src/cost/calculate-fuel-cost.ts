import type { FuelCostEstimate } from './fuel-cost-estimate.js';
import type { FuelPrice } from './fuel-price.js';
import { InvalidFuelPriceError } from './invalid-fuel-price.error.js';

const currencyPattern = /^[A-Z]{3}$/;

export function calculateFuelCost(
  totalLitres: number,
  fuelPrice: FuelPrice,
): FuelCostEstimate {
  assertTotalLitres(totalLitres);
  assertFuelPrice(fuelPrice);

  return {
    fuelPrice: {
      amountPerLitre: fuelPrice.amountPerLitre,
      currency: fuelPrice.currency,
    },
    estimatedCost: totalLitres * fuelPrice.amountPerLitre,
  };
}

function assertTotalLitres(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidFuelPriceError(
      'totalLitres must be a non-negative finite number',
    );
  }
}

function assertFuelPrice(fuelPrice: FuelPrice): void {
  if (
    !Number.isFinite(fuelPrice.amountPerLitre) ||
    fuelPrice.amountPerLitre <= 0
  ) {
    throw new InvalidFuelPriceError(
      'amountPerLitre must be a positive finite number',
    );
  }

  if (!currencyPattern.test(fuelPrice.currency)) {
    throw new InvalidFuelPriceError(
      'currency must be a three-uppercase-letter identifier',
    );
  }
}
