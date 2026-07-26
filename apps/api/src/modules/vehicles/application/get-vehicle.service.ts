import { Inject, Injectable } from '@nestjs/common';
import type { VehicleDetailResponse } from '@route-cost/contracts';
import type { VehicleCatalogEntry } from '@route-cost/vehicle-data';

import type { VehicleCatalog } from '../vehicle-catalog.port';
import { VEHICLE_CATALOG } from '../vehicle-catalog.token';
import { VehicleNotFoundApplicationError } from './vehicle-not-found.error';

@Injectable()
export class GetVehicleService {
  public constructor(
    @Inject(VEHICLE_CATALOG)
    private readonly vehicleCatalog: VehicleCatalog,
  ) {}

  public get(vehicleId: string): VehicleDetailResponse {
    const vehicle = this.vehicleCatalog.getById(vehicleId);

    if (vehicle === undefined) {
      throw new VehicleNotFoundApplicationError();
    }

    return toVehicleDetail(vehicle);
  }
}

function toVehicleDetail(vehicle: VehicleCatalogEntry): VehicleDetailResponse {
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
      methodology: vehicle.consumptionData.methodology,
      sources: vehicle.consumptionData.sources.map((source) => ({
        type: source.type,
        title: source.title,
        publisher: source.publisher,
        url: source.url,
        accessedAt: source.accessedAt,
        ...(source.notes === undefined ? {} : { notes: source.notes }),
      })),
    },
  };
}
