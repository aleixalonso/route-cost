import type { VehicleCatalogEntry } from '../models/vehicle-catalog-entry.js';
import { cloneVehicle, vehicleCatalog } from './vehicle-catalog.js';

export function getVehicleById(
  vehicleId: string,
): VehicleCatalogEntry | undefined {
  const vehicle = vehicleCatalog.find(
    (candidate) => candidate.id === vehicleId,
  );
  return vehicle === undefined ? undefined : cloneVehicle(vehicle);
}
