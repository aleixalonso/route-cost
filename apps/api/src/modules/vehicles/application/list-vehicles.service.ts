import { Inject, Injectable } from '@nestjs/common';
import type {
  VehicleListQuery,
  VehicleListResponse,
  VehicleSummary,
} from '@route-cost/contracts';
import type { VehicleCatalogEntry } from '@route-cost/vehicle-data';

import type { VehicleCatalog } from '../vehicle-catalog.port';
import { VEHICLE_CATALOG } from '../vehicle-catalog.token';

@Injectable()
export class ListVehiclesService {
  public constructor(
    @Inject(VEHICLE_CATALOG)
    private readonly vehicleCatalog: VehicleCatalog,
  ) {}

  public list(query: VehicleListQuery): VehicleListResponse {
    const items = this.vehicleCatalog
      .list(toCatalogFilters(query))
      .map(toVehicleSummary);

    return {
      items,
      total: items.length,
    };
  }
}

function toCatalogFilters(query: VehicleListQuery) {
  return {
    ...(query.search === undefined ? {} : { search: query.search }),
    ...(query.manufacturer === undefined
      ? {}
      : { manufacturer: query.manufacturer }),
    ...(query.vehicleCategory === undefined
      ? {}
      : { vehicleCategory: query.vehicleCategory }),
    ...(query.fuelType === undefined ? {} : { fuelType: query.fuelType }),
    ...(query.powertrainType === undefined
      ? {}
      : { powertrainType: query.powertrainType }),
  };
}

export function toVehicleSummary(vehicle: VehicleCatalogEntry): VehicleSummary {
  return {
    id: vehicle.id,
    manufacturer: vehicle.manufacturer,
    model: vehicle.model,
    variant: vehicle.variant,
    displayName: vehicle.displayName,
    yearFrom: vehicle.yearFrom,
    ...(vehicle.yearTo === undefined ? {} : { yearTo: vehicle.yearTo }),
    vehicleCategory: vehicle.vehicleCategory,
    fuelType: vehicle.fuelType,
    powertrainType: vehicle.powertrainType,
    ...(vehicle.engineDisplacementCc === undefined
      ? {}
      : { engineDisplacementCc: vehicle.engineDisplacementCc }),
    consumptionProfile: vehicle.consumptionProfile,
    consumptionData: {
      status: vehicle.consumptionData.status,
      confidence: vehicle.consumptionData.confidence,
      ...(vehicle.consumptionData.officialCombinedLitresPer100Km === undefined
        ? {}
        : {
            officialCombinedLitresPer100Km:
              vehicle.consumptionData.officialCombinedLitresPer100Km,
          }),
    },
  };
}
