import { describe, expect, it } from 'vitest';

import { calculateFuelCost } from './calculate-fuel-cost.js';
import type { FuelPrice } from './fuel-price.js';
import { InvalidFuelPriceError } from './invalid-fuel-price.error.js';

describe('calculateFuelCost', () => {
  it('calculates normal litres and price without rounding', () => {
    const estimate = calculateFuelCost(2.7, {
      amountPerLitre: 1.6,
      currency: 'EUR',
    });

    expect(estimate.estimatedCost).toBeCloseTo(4.32);
  });

  it('allows zero litres', () => {
    expect(
      calculateFuelCost(0, { amountPerLitre: 1.6, currency: 'EUR' })
        .estimatedCost,
    ).toBe(0);
  });

  it('supports fractional fuel price', () => {
    expect(
      calculateFuelCost(1.25, { amountPerLitre: 1.789, currency: 'EUR' })
        .estimatedCost,
    ).toBeCloseTo(2.23625);
  });

  it('preserves currency', () => {
    expect(
      calculateFuelCost(2, { amountPerLitre: 1.5, currency: 'USD' }).fuelPrice
        .currency,
    ).toBe('USD');
  });

  it.each([
    ['negative litres', -1, { amountPerLitre: 1.6, currency: 'EUR' }],
    ['negative fuel price', 1, { amountPerLitre: -1, currency: 'EUR' }],
    ['zero fuel price', 1, { amountPerLitre: 0, currency: 'EUR' }],
    ['empty currency', 1, { amountPerLitre: 1.6, currency: '' }],
    ['lowercase currency', 1, { amountPerLitre: 1.6, currency: 'eur' }],
    ['long currency', 1, { amountPerLitre: 1.6, currency: 'EURO' }],
    ['NaN litres', Number.NaN, { amountPerLitre: 1.6, currency: 'EUR' }],
    [
      'infinity price',
      1,
      { amountPerLitre: Number.POSITIVE_INFINITY, currency: 'EUR' },
    ],
  ] as const)('rejects %s', (_name, litres, fuelPrice) => {
    expect(() => calculateFuelCost(litres, fuelPrice)).toThrow(
      InvalidFuelPriceError,
    );
  });

  it('does not mutate input objects', () => {
    const fuelPrice: FuelPrice = { amountPerLitre: 1.6, currency: 'EUR' };

    calculateFuelCost(2.7, fuelPrice);

    expect(fuelPrice).toEqual({ amountPerLitre: 1.6, currency: 'EUR' });
  });
});
