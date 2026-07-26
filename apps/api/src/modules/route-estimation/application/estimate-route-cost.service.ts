import { Inject, Injectable } from '@nestjs/common';
import type {
  EstimateRouteCostRequest,
  EstimateRouteCostResponse,
} from '@route-cost/contracts';
import {
  calculateFuelCost,
  estimateRouteFuelConsumption,
} from '@route-cost/domain';
import type { RoutingProvider } from '@route-cost/routing';
import { summarizeRouteDistances } from '@route-cost/routing';

import { ResolveVehicleSelectionService } from '../../vehicles/application/resolve-vehicle-selection.service';
import { ROUTING_PROVIDER } from './routing-provider.token';

@Injectable()
export class EstimateRouteCostService {
  public constructor(
    @Inject(ROUTING_PROVIDER)
    private readonly routingProvider: RoutingProvider,
    private readonly resolveVehicleSelectionService: ResolveVehicleSelectionService,
  ) {}

  public async estimate(
    request: EstimateRouteCostRequest,
  ): Promise<EstimateRouteCostResponse> {
    const vehicle = this.resolveVehicleSelectionService.resolve(request);
    const routes = await this.routingProvider.calculateRoutes({
      origin: request.origin,
      destination: request.destination,
      vehicleCategory: vehicle.vehicleCategory,
      ...(request.alternatives === undefined
        ? {}
        : { alternatives: request.alternatives }),
    });

    return {
      vehicle,
      alternatives: routes.alternatives.map((alternative) => {
        const summary = summarizeRouteDistances(alternative.segments);
        const fuelEstimate = estimateRouteFuelConsumption(
          summary,
          vehicle.consumptionProfile,
        );
        const costEstimate = calculateFuelCost(
          fuelEstimate.totalLitres,
          request.fuelPrice,
        );

        return {
          ...alternative,
          summary,
          fuelEstimate,
          costEstimate,
        };
      }),
    };
  }
}
