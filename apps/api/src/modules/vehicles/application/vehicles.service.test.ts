import type { VehicleCatalogEntry } from '@route-cost/vehicle-data';
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

  it('retrieves a known vehicle with source records', () => {
    const vehicle = new GetVehicleService(catalog()).get(
      'honda-forza-350-2025',
    );

    expect(vehicle.displayName).toBe('Honda Forza 350');
    expect(vehicle.consumptionData.sources[0]).toMatchObject({
      publisher: 'Honda',
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

function catalog(): VehicleCatalog {
  const vehicles = [
    vehicle(),
    { ...vehicle(), id: 'toyota', vehicleCategory: 'car' },
  ] as const;

  return {
    list(filters = {}) {
      return vehicles.filter(
        (candidate) =>
          filters.vehicleCategory === undefined ||
          candidate.vehicleCategory === filters.vehicleCategory,
      );
    },
    getById(vehicleId: string) {
      return vehicles.find((candidate) => candidate.id === vehicleId);
    },
  };
}

function vehicle(): VehicleCatalogEntry {
  return {
    id: 'honda-forza-350-2025',
    manufacturer: 'Honda',
    model: 'Forza 350',
    variant: 'Standard',
    displayName: 'Honda Forza 350',
    yearFrom: 2025,
    vehicleCategory: 'maxi-scooter',
    fuelType: 'petrol',
    powertrainType: 'internal-combustion',
    engineDisplacementCc: 330,
    consumptionProfile: {
      urbanLitresPer100Km: 3.7,
      interurbanLitresPer100Km: 3.1,
      motorwayLitresPer100Km: 4,
      unknownLitresPer100Km: 3.4,
    },
    consumptionData: {
      status: 'estimated',
      confidence: 'medium',
      officialCombinedLitresPer100Km: 3.4,
      methodology: 'Estimated.',
      sources: [
        {
          type: 'manufacturer',
          title: 'Spec',
          publisher: 'Honda',
          url: 'https://example.com',
          accessedAt: '2026-07-26',
        },
      ],
    },
  };
}
