import { Injectable } from '@nestjs/common';
import {
  getVehicleById,
  listVehicles,
  type VehicleCatalogEntry,
  type VehicleCatalogFilters,
} from '@route-cost/vehicle-data';

import type { VehicleCatalog } from '../vehicle-catalog.port';

@Injectable()
export class StaticVehicleCatalogAdapter implements VehicleCatalog {
  public list(filters?: VehicleCatalogFilters): readonly VehicleCatalogEntry[] {
    return listVehicles(filters);
  }

  public getById(vehicleId: string): VehicleCatalogEntry | undefined {
    return getVehicleById(vehicleId);
  }
}
