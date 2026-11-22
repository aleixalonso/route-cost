import {
  filterVehicles,
  type VehicleCatalogEntry,
} from '@route-cost/vehicle-data';
import { describe, expect, it } from 'vitest';

import type { VehicleCatalog } from '../vehicle-catalog.port';
import { GetVehicleService } from './get-vehicle.service';
import { ListVehiclesService } from './list-vehicles.service';
import { ResolveVehicleSelectionService } from './resolve-vehicle-selection.service';
import { VehicleNotFoundApplicationError } from './vehicle-not-found.error';

describe('vehicle services', () => {
  it('lists all vehicles and applies filters', () => {
    const service = new ListVehiclesService(catalog());

    expect(service.list({}).total).toBe(2);
    expect(service.list({ vehicleCategory: 'car' }).items).toHaveLength(1);
  });

  it('omits absent optional fields from summaries and includes supplied ones', () => {
    const result = new ListVehiclesService(
      catalog([vehicle(), vehicle(true)]),
    ).list({});

    expect(result.total).toBe(2);
    expect(result.items[0]).not.toHaveProperty('yearTo');
    expect(result.items[0]).not.toHaveProperty('engineDisplacementCc');
    expect(result.items[0]?.consumptionData).not.toHaveProperty(
      'officialCombinedLitresPer100Km',
    );
    expect(result.items[1]).toMatchObject({
      yearTo: 2026,
      engineDisplacementCc: 330,
      consumptionData: { officialCombinedLitresPer100Km: 3.4 },
    });
  });

  it('forwards combined catalog filters and returns only matching summaries', () => {
    const service = new ListVehiclesService(catalog());

    expect(
      service
        .list({
          search: 'Forza',
          manufacturer: 'Honda',
          fuelType: 'petrol',
          powertrainType: 'internal-combustion',
        })
        .items.map((item) => item.id),
    ).toEqual(['honda-forza-350-2025']);
    expect(
      service.list({
        search: 'Forza',
        fuelType: 'diesel',
        powertrainType: 'internal-combustion',
      }),
    ).toEqual({ items: [], total: 0 });
  });

  it('retrieves a known vehicle with source records', () => {
    const vehicle = new GetVehicleService(catalog()).get(
      'honda-forza-350-2025',
    );

    expect(vehicle.displayName).toBe('Honda Forza 350');
    expect(vehicle.consumptionData.sources[0]).toMatchObject({
      publisher: 'Honda',
    });
  });

  it('omits absent optional detail fields and includes supplied ones', () => {
    const service = new GetVehicleService(
      catalog([vehicle(), { ...vehicle(true), id: 'complete' }]),
    );
    const sparse = service.get('honda-forza-350-2025');
    const complete = service.get('complete');

    expect(sparse).not.toHaveProperty('yearTo');
    expect(sparse).not.toHaveProperty('engineDisplacementCc');
    expect(sparse.consumptionData).not.toHaveProperty(
      'officialCombinedLitresPer100Km',
    );
    expect(sparse.consumptionData.sources[0]).not.toHaveProperty('notes');
    expect(complete).toMatchObject({
      yearTo: 2026,
      engineDisplacementCc: 330,
      consumptionData: {
        officialCombinedLitresPer100Km: 3.4,
        sources: [{ notes: 'Manufacturer specification.' }],
      },
    });
  });

  it('raises an application error for unknown vehicles', () => {
    expect(() => new GetVehicleService(catalog()).get('missing')).toThrow(
      VehicleNotFoundApplicationError,
    );
  });
});

describe('ResolveVehicleSelectionService', () => {
  it('resolves catalog metadata', () => {
    const result = new ResolveVehicleSelectionService(catalog()).resolve({
      origin: { latitude: 41, longitude: 2 },
      destination: { latitude: 42, longitude: 3 },
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
    });

    expect(result).toMatchObject({
      source: 'catalog',
      vehicleCategory: 'maxi-scooter',
      fuelType: 'petrol',
      powertrainType: 'internal-combustion',
      consumptionData: { status: 'estimated', confidence: 'medium' },
    });
    expect(result.consumptionProfile.urbanLitresPer100Km).toBe(3.7);
  });

  it('resolves custom mode without catalog metadata', () => {
    const result = new ResolveVehicleSelectionService(catalog()).resolve({
      origin: { latitude: 41, longitude: 2 },
      destination: { latitude: 42, longitude: 3 },
      vehicleCategory: 'maxi-scooter',
      consumptionProfile: {
        urbanLitresPer100Km: 4,
        interurbanLitresPer100Km: 3,
        motorwayLitresPer100Km: 5,
        unknownLitresPer100Km: 4,
      },
      fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
    });

    expect(result).toEqual({
      source: 'custom',
      vehicleCategory: 'maxi-scooter',
      consumptionProfile: {
        urbanLitresPer100Km: 4,
        interurbanLitresPer100Km: 3,
        motorwayLitresPer100Km: 5,
        unknownLitresPer100Km: 4,
      },
    });
  });

  it('fails for unknown catalog IDs', () => {
    expect(() =>
      new ResolveVehicleSelectionService(catalog()).resolve({
        origin: { latitude: 41, longitude: 2 },
        destination: { latitude: 42, longitude: 3 },
        vehicleId: 'missing',
        fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
      }),
    ).toThrow(VehicleNotFoundApplicationError);
  });
});

function catalog(
  vehicles: readonly VehicleCatalogEntry[] = [
    vehicle(),
    {
      ...vehicle(),
      id: 'toyota',
      manufacturer: 'Toyota',
      model: 'Prius',
      displayName: 'Toyota Prius',
      vehicleCategory: 'car',
    },
  ],
): VehicleCatalog {
  return {
    list(filters = {}) {
      return filterVehicles(vehicles, filters);
    },
    getById(vehicleId: string) {
      return vehicles.find((candidate) => candidate.id === vehicleId);
    },
  };
}

function vehicle(includeOptional = false): VehicleCatalogEntry {
  return {
    id: 'honda-forza-350-2025',
    manufacturer: 'Honda',
    model: 'Forza 350',
    variant: 'Standard',
    displayName: 'Honda Forza 350',
    yearFrom: 2025,
    ...(includeOptional ? { yearTo: 2026 } : {}),
    vehicleCategory: 'maxi-scooter',
    fuelType: 'petrol',
    powertrainType: 'internal-combustion',
    ...(includeOptional ? { engineDisplacementCc: 330 } : {}),
    consumptionProfile: {
      urbanLitresPer100Km: 3.7,
      interurbanLitresPer100Km: 3.1,
      motorwayLitresPer100Km: 4,
      unknownLitresPer100Km: 3.4,
    },
    consumptionData: {
      status: 'estimated',
      confidence: 'medium',
      ...(includeOptional ? { officialCombinedLitresPer100Km: 3.4 } : {}),
      methodology: 'Estimated.',
      sources: [
        {
          type: 'manufacturer',
          title: 'Spec',
          publisher: 'Honda',
          url: 'https://example.com',
          accessedAt: '2026-07-26',
          ...(includeOptional ? { notes: 'Manufacturer specification.' } : {}),
        },
      ],
    },
  };
}
