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

import { ROUTING_PROVIDER } from './routing-provider.token';

@Injectable()
export class EstimateRouteCostService {
  public constructor(
    @Inject(ROUTING_PROVIDER)
    private readonly routingProvider: RoutingProvider,
  ) {}

  public async estimate(
    request: EstimateRouteCostRequest,
  ): Promise<EstimateRouteCostResponse> {
    const routes = await this.routingProvider.calculateRoutes({
      origin: request.origin,
      destination: request.destination,
      vehicleCategory: request.vehicleCategory,
      ...(request.alternatives === undefined
        ? {}
        : { alternatives: request.alternatives }),
    });

    return {
      alternatives: routes.alternatives.map((alternative) => {
        const summary = summarizeRouteDistances(alternative.segments);
        const fuelEstimate = estimateRouteFuelConsumption(
          summary,
          request.consumptionProfile,
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
