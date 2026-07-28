import { Inject, Injectable } from '@nestjs/common';
import type { FuelProduct } from '@route-cost/fuel-prices';
import type { VehicleCatalogEntry } from '@route-cost/vehicle-data';

import { VehicleNotFoundApplicationError } from '../../vehicles/application/vehicle-not-found.error';
import type { VehicleCatalog } from '../../vehicles/vehicle-catalog.port';
import { VEHICLE_CATALOG } from '../../vehicles/vehicle-catalog.token';
import { VehicleFuelProductUnsupportedError } from './fuel-price-errors';

@Injectable()
export class ResolveRequestedFuelProductService {
  public constructor(
    @Inject(VEHICLE_CATALOG)
    private readonly vehicleCatalog: VehicleCatalog,
  ) {}

  public resolve(request: {
    readonly vehicleId?: string;
    readonly fuelProduct?: FuelProduct;
  }): FuelProduct {
    if (request.fuelProduct !== undefined) {
      return request.fuelProduct;
    }

    const vehicleId = request.vehicleId;

    if (vehicleId === undefined) {
      throw new VehicleFuelProductUnsupportedError();
    }

    const vehicle = this.vehicleCatalog.getById(vehicleId);

    if (vehicle === undefined) {
      throw new VehicleNotFoundApplicationError();
    }

    const fuelProduct = resolveCatalogVehicleFuelProduct(vehicle);

    if (fuelProduct === undefined) {
      throw new VehicleFuelProductUnsupportedError();
    }

    return fuelProduct;
  }
}

export function resolveCatalogVehicleFuelProduct(
  vehicle: VehicleCatalogEntry,
): FuelProduct | undefined {
  if (
    vehicle.fuelType === 'petrol' &&
    (vehicle.powertrainType === 'internal-combustion' ||
      vehicle.powertrainType === 'full-hybrid')
  ) {
    return 'petrol-95-e5';
  }

  if (
    vehicle.fuelType === 'diesel' &&
    vehicle.powertrainType === 'internal-combustion'
  ) {
    return 'diesel-a';
  }

  return undefined;
}
