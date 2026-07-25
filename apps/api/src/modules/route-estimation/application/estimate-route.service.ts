import { Inject, Injectable } from '@nestjs/common';
import type {
  EstimateRouteRequest,
  EstimateRouteResponse,
} from '@route-cost/contracts';
import {
  type RoutingProvider,
  summarizeRouteDistances,
} from '@route-cost/routing';

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
    const routes = await this.routingProvider.calculateRoutes({
      origin: request.origin,
      destination: request.destination,
      vehicleCategory: request.vehicleCategory,
      ...(request.alternatives === undefined
        ? {}
        : { alternatives: request.alternatives }),
    });

    return {
      alternatives: routes.alternatives.map((alternative) => ({
        ...alternative,
        summary: summarizeRouteDistances(alternative.segments),
      })),
    };
  }
}
