import type { VehicleCatalogEntry } from '../models/vehicle-catalog-entry.js';
import {
  filterVehicles,
  type VehicleCatalogFilters,
} from './filter-vehicles.js';
import { vehicleCatalog } from './vehicle-catalog.js';

export function listVehicles(
  filters?: VehicleCatalogFilters,
): readonly VehicleCatalogEntry[] {
  return filterVehicles(vehicleCatalog, filters);
}
