import { describe, expect, it } from 'vitest';

import { calculateFuelCost } from './calculate-fuel-cost.js';

describe('calculateFuelCost', () => {
  it('calculates litres consumed and estimated cost without rounding', () => {
    expect(
      calculateFuelCost({
        distanceKm: 123.45,
        litresPer100Km: 6.7,
        pricePerLitre: 1.89,
      }),
    ).toEqual({
      litresConsumed: 8.27115,
      estimatedCost: 15.6324735,
    });
  });

  it('rejects negative numbers', () => {
    expect(() =>
      calculateFuelCost({
        distanceKm: -1,
        litresPer100Km: 6,
        pricePerLitre: 1.5,
      }),
    ).toThrow(RangeError);
  });
});
