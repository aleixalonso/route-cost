import { describe, expect, it } from 'vitest';

import {
  calculateDistanceMetres,
  calculateFuelPriceSuggestion,
  calculateMedian,
  CountryFuelPriceProviderMap,
  type FuelStation,
  selectNearbyStations,
} from './index.js';

describe('calculateMedian', () => {
  it('calculates odd and even medians without mutating input', () => {
    const values = [3, 1, 2];

    expect(calculateMedian(values)).toBe(2);
    expect(values).toEqual([3, 1, 2]);
    expect(calculateMedian([1.1, 1.5, 1.7, 1.9])).toBe(1.6);
  });

  it('rejects empty and non-finite values', () => {
    expect(() => calculateMedian([])).toThrow('empty');
    expect(() => calculateMedian([1, Number.NaN])).toThrow('finite');
    expect(() => calculateMedian([1, Number.POSITIVE_INFINITY])).toThrow(
      'finite',
    );
  });
});

describe('calculateDistanceMetres', () => {
  it('calculates deterministic distances', () => {
    expect(
      calculateDistanceMetres(
        { latitude: 41.387, longitude: 2.17 },
        { latitude: 41.387, longitude: 2.17 },
      ),
    ).toBe(0);
    expect(
      calculateDistanceMetres(
        { latitude: 41.387, longitude: 2.17 },
        { latitude: 41.4036, longitude: 2.1744 },
      ),
    ).toBeCloseTo(1881, -1);
    expect(
      calculateDistanceMetres(
        { latitude: 51.5074, longitude: -0.1278 },
        { latitude: 40.7128, longitude: -74.006 },
      ),
    ).toBeCloseTo(5_570_222, -3);
  });

  it('rejects invalid coordinates', () => {
    expect(() =>
      calculateDistanceMetres(
        { latitude: 91, longitude: 0 },
        { latitude: 0, longitude: 0 },
      ),
    ).toThrow('coordinate');
    expect(() =>
      calculateDistanceMetres(
        { latitude: 0, longitude: Number.NaN },
        { latitude: 0, longitude: 0 },
      ),
    ).toThrow('coordinate');
  });
});

describe('selectNearbyStations and suggestion', () => {
  it('expands radius, excludes stale prices, caps, and calculates metadata', () => {
    const now = new Date('2026-07-28T17:00:00Z');
    const result = {
      countryCode: 'ES',
      currency: 'EUR',
      sourceUpdatedAt: '2026-07-28T16:00:00Z',
      retrievedAt: '2026-07-28T17:00:00Z',
      stations: [
        station('a', 41.387, 2.17, 1.6, '2026-07-28T15:00:00Z'),
        station('b', 41.39, 2.17, 1.7, '2026-07-28T14:00:00Z'),
        station('c', 41.45, 2.17, 1.5, '2026-07-28T13:00:00Z'),
        station('d', 41.5, 2.17, 1.8, '2026-07-24T13:00:00Z'),
        station('e', 42, 2.17, 1.4, '2026-07-28T13:00:00Z'),
      ],
      attribution: { label: 'Official fuel-price data for Spain' },
    };

    const selected = selectNearbyStations(
      result,
      { latitude: 41.387, longitude: 2.17 },
      'petrol-95-e5',
      {
        radiusStepsMetres: [500, 10_000, 25_000],
        minStationCount: 3,
        maxStationCount: 3,
        maxDataAgeHours: 72,
      },
      now,
    );

    expect(selected.radiusMetres).toBe(10_000);
    expect(selected.stations.map((item) => item.station.id)).toEqual([
      'a',
      'b',
      'c',
    ]);

    const suggestion = calculateFuelPriceSuggestion({
      result,
      selected,
    });

    expect(suggestion.suggestedPricePerLitre.amount).toBe(1.6);
    expect(suggestion.minimumPricePerLitre).toBe(1.5);
    expect(suggestion.maximumPricePerLitre).toBe(1.7);
    expect(suggestion.stationCount).toBe(3);
    expect(suggestion.oldestPriceUpdatedAt).toBe('2026-07-28T13:00:00Z');
    expect(suggestion.newestPriceUpdatedAt).toBe('2026-07-28T15:00:00Z');
  });

  it('returns empty selection when no valid stations exist', () => {
    const selected = selectNearbyStations(
      {
        countryCode: 'ES',
        currency: 'EUR',
        retrievedAt: '2026-07-28T17:00:00Z',
        stations: [station('a', 41.387, 2.17, 0, undefined)],
      },
      { latitude: 41.387, longitude: 2.17 },
      'petrol-95-e5',
      {
        radiusStepsMetres: [5_000],
        minStationCount: 1,
        maxStationCount: 30,
        maxDataAgeHours: 72,
      },
    );

    expect(selected.stations).toEqual([]);
  });

  it('rejects invalid search config and empty suggestions', () => {
    expect(() =>
      selectNearbyStations(
        {
          countryCode: 'ES',
          currency: 'EUR',
          retrievedAt: '2026-07-28T17:00:00Z',
          stations: [],
        },
        { latitude: 41.387, longitude: 2.17 },
        'petrol-95-e5',
        {
          radiusStepsMetres: [5_000, 5_000],
          minStationCount: 1,
          maxStationCount: 30,
          maxDataAgeHours: 72,
        },
      ),
    ).toThrow('strictly increasing');

    expect(() =>
      calculateFuelPriceSuggestion({
        result: {
          countryCode: 'ES',
          currency: 'EUR',
          retrievedAt: '2026-07-28T17:00:00Z',
          stations: [],
        },
        selected: { radiusMetres: 5_000, stations: [] },
      }),
    ).toThrow('without selected stations');
  });
});

describe('CountryFuelPriceProviderMap', () => {
  it('normalizes lookups and rejects duplicate providers', () => {
    const provider = {
      countryCode: 'ES',
      getNearbyFuelPrices: () =>
        Promise.resolve({
          countryCode: 'ES',
          currency: 'EUR',
          retrievedAt: '2026-07-28T17:00:00Z',
          stations: [],
        }),
    };

    expect(new CountryFuelPriceProviderMap([provider]).getProvider('es')).toBe(
      provider,
    );
    expect(() => new CountryFuelPriceProviderMap([provider, provider])).toThrow(
      'Duplicate',
    );
  });

  it('rejects malformed country codes and provider country mismatches', () => {
    expect(() =>
      new CountryFuelPriceProviderMap([]).getProvider('bad'),
    ).toThrow('Country code');
    expect(
      () =>
        new CountryFuelPriceProviderMap([
          {
            countryCode: 'es',
            getNearbyFuelPrices: () =>
              Promise.resolve({
                countryCode: 'ES',
                currency: 'EUR',
                retrievedAt: '2026-07-28T17:00:00Z',
                stations: [],
              }),
          },
        ]),
    ).toThrow('normalized');
  });
});

function station(
  id: string,
  latitude: number,
  longitude: number,
  amount: number,
  updatedAt: string | undefined,
): FuelStation {
  return {
    id,
    coordinate: { latitude, longitude },
    countryCode: 'ES',
    prices: [
      {
        fuelProduct: 'petrol-95-e5',
        pricePerLitre: { amount, currency: 'EUR' },
        ...(updatedAt === undefined ? {} : { updatedAt }),
      },
    ],
  };
}
