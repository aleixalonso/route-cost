import type { VehicleCatalogEntry } from '../models/vehicle-catalog-entry.js';
import type { VehicleFuelType } from '../models/vehicle-fuel-type.js';
import type { VehiclePowertrainType } from '../models/vehicle-powertrain-type.js';
import type { VehicleRoutingCategory } from '../models/vehicle-routing-category.js';
import { normalizeSearchText } from './normalize-search-text.js';
import { cloneVehicle } from './vehicle-catalog.js';

export interface VehicleCatalogFilters {
  readonly search?: string;
  readonly manufacturer?: string;
  readonly vehicleCategory?: VehicleRoutingCategory;
  readonly fuelType?: VehicleFuelType;
  readonly powertrainType?: VehiclePowertrainType;
}

export function filterVehicles(
  vehicles: readonly VehicleCatalogEntry[],
  filters: VehicleCatalogFilters = {},
): readonly VehicleCatalogEntry[] {
  const search = filters.search && normalizeSearchText(filters.search);
  const manufacturer =
    filters.manufacturer && normalizeSearchText(filters.manufacturer);

  return vehicles
    .filter((vehicle) => {
      if (
        search !== undefined &&
        ![
          vehicle.manufacturer,
          vehicle.model,
          vehicle.variant,
          vehicle.displayName,
        ]
          .map(normalizeSearchText)
          .some((value) => value.includes(search))
      ) {
        return false;
      }

      if (
        manufacturer !== undefined &&
        normalizeSearchText(vehicle.manufacturer) !== manufacturer
      ) {
        return false;
      }

      if (
        filters.vehicleCategory !== undefined &&
        vehicle.vehicleCategory !== filters.vehicleCategory
      ) {
        return false;
      }

      if (
        filters.fuelType !== undefined &&
        vehicle.fuelType !== filters.fuelType
      ) {
        return false;
      }

      if (
        filters.powertrainType !== undefined &&
        vehicle.powertrainType !== filters.powertrainType
      ) {
        return false;
      }

      return true;
    })
    .sort(compareVehicles)
    .map(cloneVehicle);
}

function compareVehicles(
  left: VehicleCatalogEntry,
  right: VehicleCatalogEntry,
): number {
  return (
    left.manufacturer.localeCompare(right.manufacturer) ||
    left.model.localeCompare(right.model) ||
    left.variant.localeCompare(right.variant) ||
    left.yearFrom - right.yearFrom
  );
}
