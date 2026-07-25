import { Inject, Injectable } from '@nestjs/common';
import type {
  EstimateRouteRequest,
  EstimateRouteResponse,
} from '@route-cost/contracts';
import { calculateFuelCost } from '@route-cost/domain';
import type { RoutingProvider } from '@route-cost/routing';
import { getVehicleById } from '@route-cost/vehicle-data';

import { ROUTING_PROVIDER } from './routing-provider.token';

@Injectable()
export class EstimateRouteService {
  public constructor(
    @Inject(ROUTING_PROVIDER)
    private readonly routingProvider: RoutingProvider,
  ) {}

  public async estimate(
    request: EstimateRouteRequest,
  ): Promise<EstimateRouteResponse> {
    const vehicle = getVehicleById(request.vehicleId);
    const routes = await this.routingProvider.calculateRoutes({
      origin: request.origin,
      destination: request.destination,
    });
    const route = routes.alternatives[0];

    if (!vehicle || !route) {
      return {
        distanceKm: 0,
        durationSeconds: 0,
        estimatedCost: 0,
      };
    }

    return {
      distanceKm: route.distanceKm,
      durationSeconds: route.durationSeconds,
      estimatedCost: calculateFuelCost({
        distanceKm: route.distanceKm,
        litresPer100Km: vehicle.litresPer100Km,
        pricePerLitre: 1.75,
      }).estimatedCost,
    };
  }
}
