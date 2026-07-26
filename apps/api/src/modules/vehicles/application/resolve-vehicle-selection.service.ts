import { Inject, Injectable } from '@nestjs/common';
import type {
  EstimateRouteCostRequest,
  routeCostVehicleSelectionSchema,
} from '@route-cost/contracts';
import type { z } from 'zod';

import type { VehicleCatalog } from '../vehicle-catalog.port';
import { VEHICLE_CATALOG } from '../vehicle-catalog.token';
import { VehicleNotFoundApplicationError } from './vehicle-not-found.error';

export type ResolvedVehicleSelection = z.infer<
  typeof routeCostVehicleSelectionSchema
>;

@Injectable()
export class ResolveVehicleSelectionService {
  public constructor(
    @Inject(VEHICLE_CATALOG)
    private readonly vehicleCatalog: VehicleCatalog,
  ) {}

  public resolve(request: EstimateRouteCostRequest): ResolvedVehicleSelection {
    if (request.vehicleId !== undefined) {
      const vehicle = this.vehicleCatalog.getById(request.vehicleId);

      if (vehicle === undefined) {
        throw new VehicleNotFoundApplicationError();
      }

      return {
        source: 'catalog',
        vehicleId: vehicle.id,
        displayName: vehicle.displayName,
        vehicleCategory: vehicle.vehicleCategory,
        fuelType: vehicle.fuelType,
        powertrainType: vehicle.powertrainType,
        consumptionProfile: vehicle.consumptionProfile,
        consumptionData: {
          status: vehicle.consumptionData.status,
          confidence: vehicle.consumptionData.confidence,
        },
      };
    }

    if (
      request.vehicleCategory === undefined ||
      request.consumptionProfile === undefined
    ) {
      throw new Error('Invalid vehicle selection.');
    }

    return {
      source: 'custom',
      vehicleCategory: request.vehicleCategory,
      consumptionProfile: request.consumptionProfile,
    };
  }
}
