import type {
  VehicleCatalogEntry,
  VehicleCatalogFilters,
} from '@route-cost/vehicle-data';

export interface VehicleCatalog {
  list(filters?: VehicleCatalogFilters): readonly VehicleCatalogEntry[];
  getById(vehicleId: string): VehicleCatalogEntry | undefined;
}
