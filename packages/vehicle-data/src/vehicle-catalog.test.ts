import { describe, expect, it } from 'vitest';

import {
  getVehicleById,
  listVehicles,
  vehicleCatalog,
  vehicleCatalogEntrySchema,
  vehicleCatalogSchema,
} from './index.js';

describe('vehicle catalog data', () => {
  it('validates every catalog entry and complete catalog', () => {
    for (const vehicle of vehicleCatalog) {
      expect(() => vehicleCatalogEntrySchema.parse(vehicle)).not.toThrow();
    }

    expect(() => vehicleCatalogSchema.parse(vehicleCatalog)).not.toThrow();
  });

  it('contains exactly the required six entries and category matrix', () => {
    const vehicles = listVehicles();

    expect(vehicles).toHaveLength(6);
    expect(
      vehicles.filter((vehicle) => vehicle.vehicleCategory === 'car'),
    ).toHaveLength(3);
    expect(
      vehicles.filter((vehicle) => vehicle.vehicleCategory !== 'car'),
    ).toHaveLength(3);
    expect(
      vehicles.filter((vehicle) => vehicle.vehicleCategory === 'maxi-scooter'),
    ).toHaveLength(2);
    expect(
      vehicles.filter((vehicle) => vehicle.vehicleCategory === 'motorcycle'),
    ).toHaveLength(1);
  });

  it('has unique IDs and display names', () => {
    const vehicles = listVehicles();

    expect(new Set(vehicles.map((vehicle) => vehicle.id)).size).toBe(6);
    expect(new Set(vehicles.map((vehicle) => vehicle.displayName)).size).toBe(
      6,
    );
  });

  it('has valid years, consumption values, source URLs, and access dates', () => {
    for (const vehicle of listVehicles()) {
      expect(vehicle.yearTo ?? vehicle.yearFrom).toBeGreaterThanOrEqual(
        vehicle.yearFrom,
      );
      const rates = [
        vehicle.consumptionProfile.urbanLitresPer100Km,
        vehicle.consumptionProfile.interurbanLitresPer100Km,
        vehicle.consumptionProfile.motorwayLitresPer100Km,
        vehicle.consumptionProfile.unknownLitresPer100Km,
      ];

      expect(rates.every(Number.isFinite)).toBe(true);
      expect(rates.every((value) => value > 0)).toBe(true);
      expect(vehicle.consumptionData.sources.length).toBeGreaterThan(0);
      expect(vehicle.consumptionData.methodology.trim().length).toBeGreaterThan(
        0,
      );
      for (const source of vehicle.consumptionData.sources) {
        expect(source.url).toMatch(/^https?:\/\//);
        expect(source.accessedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('matches the required fuel and powertrain combinations', () => {
    expect(
      listVehicles().map((vehicle) => [
        vehicle.id,
        vehicle.vehicleCategory,
        vehicle.fuelType,
        vehicle.powertrainType,
      ]),
    ).toEqual([
      ['honda-forza-350-2025', 'maxi-scooter', 'petrol', 'internal-combustion'],
      ['honda-nx500-2025', 'motorcycle', 'petrol', 'internal-combustion'],
      ['toyota-corolla-1-8-hybrid-2025', 'car', 'petrol', 'full-hybrid'],
      ['volkswagen-golf-1-5-tsi-2025', 'car', 'petrol', 'internal-combustion'],
      ['volkswagen-golf-2-0-tdi-2025', 'car', 'diesel', 'internal-combustion'],
      ['yamaha-xmax-300-2025', 'maxi-scooter', 'petrol', 'internal-combustion'],
    ]);
  });

  it('returns defensive copies', () => {
    const vehicle = listVehicles()[0];

    if (vehicle === undefined) {
      throw new Error('Expected vehicle.');
    }

    (vehicle as { displayName: string }).displayName = 'Changed';

    expect(listVehicles()[0]?.displayName).not.toBe('Changed');
  });

  it('retrieves vehicles by id', () => {
    expect(getVehicleById('honda-forza-350-2025')?.displayName).toBe(
      'Honda Forza 350',
    );
    expect(getVehicleById('missing')).toBeUndefined();
  });

  it('sorts results deterministically', () => {
    expect(listVehicles().map((vehicle) => vehicle.id)).toEqual([
      'honda-forza-350-2025',
      'honda-nx500-2025',
      'toyota-corolla-1-8-hybrid-2025',
      'volkswagen-golf-1-5-tsi-2025',
      'volkswagen-golf-2-0-tdi-2025',
      'yamaha-xmax-300-2025',
    ]);
  });
});

describe('vehicle catalog filters', () => {
  it('returns all vehicles for empty filters', () => {
    expect(listVehicles({})).toHaveLength(6);
  });

  it.each([
    [
      'manufacturer',
      { search: 'Honda' },
      ['honda-forza-350-2025', 'honda-nx500-2025'],
    ],
    [
      'model',
      { search: 'Golf' },
      ['volkswagen-golf-1-5-tsi-2025', 'volkswagen-golf-2-0-tdi-2025'],
    ],
    ['variant', { search: '1.8   hybrid' }, ['toyota-corolla-1-8-hybrid-2025']],
    ['display name', { search: '  yamaha xmax  ' }, ['yamaha-xmax-300-2025']],
    [
      'case-insensitive',
      { search: 'vOlKsWaGeN' },
      ['volkswagen-golf-1-5-tsi-2025', 'volkswagen-golf-2-0-tdi-2025'],
    ],
  ] as const)('searches by %s', (_name, filters, expectedIds) => {
    expect(listVehicles(filters).map((vehicle) => vehicle.id)).toEqual(
      expectedIds,
    );
  });

  it('filters by manufacturer case-insensitively', () => {
    expect(
      listVehicles({ manufacturer: '  honda ' }).map((vehicle) => vehicle.id),
    ).toEqual(['honda-forza-350-2025', 'honda-nx500-2025']);
  });

  it.each([
    ['vehicle category', { vehicleCategory: 'maxi-scooter' }, 2],
    ['fuel type', { fuelType: 'diesel' }, 1],
    ['powertrain', { powertrainType: 'full-hybrid' }, 1],
  ] as const)('filters by %s', (_name, filters, expectedLength) => {
    expect(listVehicles(filters)).toHaveLength(expectedLength);
  });

  it('combines filters with AND behavior', () => {
    expect(
      listVehicles({
        search: 'honda',
        vehicleCategory: 'maxi-scooter',
      }).map((vehicle) => vehicle.id),
    ).toEqual(['honda-forza-350-2025']);
  });

  it('returns an empty array for no matches', () => {
    expect(listVehicles({ search: 'does not exist' })).toEqual([]);
  });

  it('does not mutate source data after filtering', () => {
    listVehicles({ search: 'honda' });

    expect(vehicleCatalog).toHaveLength(6);
  });
});
