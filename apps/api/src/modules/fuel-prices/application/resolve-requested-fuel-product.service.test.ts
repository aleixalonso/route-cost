import type { VehicleCatalogEntry } from '@route-cost/vehicle-data';
import { describe, expect, it, vi } from 'vitest';

import { VehicleNotFoundApplicationError } from '../../vehicles/application/vehicle-not-found.error';
import type { VehicleCatalog } from '../../vehicles/vehicle-catalog.port';
import { VehicleFuelProductUnsupportedError } from './fuel-price-errors';
import {
  resolveCatalogVehicleFuelProduct,
  ResolveRequestedFuelProductService,
} from './resolve-requested-fuel-product.service';

describe('resolveCatalogVehicleFuelProduct', () => {
  it('maps petrol internal-combustion vehicles to petrol-95-e5', () => {
    expect(
      resolveCatalogVehicleFuelProduct(
        vehicle('petrol', 'internal-combustion'),
      ),
    ).toBe('petrol-95-e5');
  });

  it('maps petrol full-hybrid vehicles to petrol-95-e5', () => {
    expect(
      resolveCatalogVehicleFuelProduct(vehicle('petrol', 'full-hybrid')),
    ).toBe('petrol-95-e5');
  });

  it('maps diesel internal-combustion vehicles to diesel-a', () => {
    expect(
      resolveCatalogVehicleFuelProduct(
        vehicle('diesel', 'internal-combustion'),
      ),
    ).toBe('diesel-a');
  });

  it('returns undefined for unsupported powertrain and fuel combinations', () => {
    expect(
      resolveCatalogVehicleFuelProduct(vehicle('diesel', 'full-hybrid')),
    ).toBeUndefined();
  });
});

describe('ResolveRequestedFuelProductService', () => {
  it('prefers an explicit fuel product without touching the catalog', () => {
    const getById = vi.fn();
    const catalog = { getById } as unknown as VehicleCatalog;

    expect(
      new ResolveRequestedFuelProductService(catalog).resolve({
        fuelProduct: 'diesel-a',
      }),
    ).toBe('diesel-a');
    expect(getById).not.toHaveBeenCalled();
  });

  it('resolves the fuel product from a catalog vehicle', () => {
    const catalog = catalogFixture(vehicle('petrol', 'full-hybrid'));

    expect(
      new ResolveRequestedFuelProductService(catalog).resolve({
        vehicleId: 'test-vehicle',
      }),
    ).toBe('petrol-95-e5');
  });

  it('throws when the vehicle does not exist in the catalog', () => {
    const catalog = catalogFixture();

    expect(() =>
      new ResolveRequestedFuelProductService(catalog).resolve({
        vehicleId: 'missing',
      }),
    ).toThrow(VehicleNotFoundApplicationError);
  });

  it('throws when no selection is provided', () => {
    expect(() =>
      new ResolveRequestedFuelProductService(catalogFixture()).resolve({}),
    ).toThrow(VehicleFuelProductUnsupportedError);
  });

  it('throws when the catalog vehicle has an unsupported fuel product', () => {
    const catalog = catalogFixture(vehicle('diesel', 'full-hybrid'));

    expect(() =>
      new ResolveRequestedFuelProductService(catalog).resolve({
        vehicleId: 'test-vehicle',
      }),
    ).toThrow(VehicleFuelProductUnsupportedError);
  });
});

function vehicle(
  fuelType: VehicleCatalogEntry['fuelType'],
  powertrainType: VehicleCatalogEntry['powertrainType'],
): VehicleCatalogEntry {
  return {
    id: 'test-vehicle',
    manufacturer: 'Test',
    model: 'Test',
    variant: 'Test',
    displayName: 'Test Vehicle',
    yearFrom: 2025,
    vehicleCategory: 'car',
    fuelType,
    powertrainType,
    consumptionProfile: {
      urbanLitresPer100Km: 5,
      interurbanLitresPer100Km: 4,
      motorwayLitresPer100Km: 5,
      unknownLitresPer100Km: 4.5,
    },
    consumptionData: {
      status: 'estimated',
      confidence: 'medium',
      methodology: 'test fixture',
      sources: [],
    },
  } satisfies VehicleCatalogEntry;
}

function catalogFixture(
  entry: VehicleCatalogEntry | undefined = undefined,
): VehicleCatalog {
  return {
    getById: vi.fn().mockReturnValue(entry),
  } as unknown as VehicleCatalog;
}
