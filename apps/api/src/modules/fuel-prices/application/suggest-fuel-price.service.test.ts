import { describe, expect, it } from 'vitest';

import { toFuelPriceSearchConfig } from './suggest-fuel-price.service';

describe('toFuelPriceSearchConfig', () => {
  it('parses radius steps and maps the fuel price limits', () => {
    expect(
      toFuelPriceSearchConfig({
        FUEL_PRICE_RADIUS_STEPS_METRES: '5000,10000,25000',
        FUEL_PRICE_MIN_STATION_COUNT: 5,
        FUEL_PRICE_MAX_STATION_COUNT: 30,
        FUEL_PRICE_MAX_DATA_AGE_HOURS: 72,
      }),
    ).toEqual({
      radiusStepsMetres: [5_000, 10_000, 25_000],
      minStationCount: 5,
      maxStationCount: 30,
      maxDataAgeHours: 72,
    });
  });
});
