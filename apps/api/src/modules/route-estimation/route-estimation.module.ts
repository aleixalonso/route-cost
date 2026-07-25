import { Module } from '@nestjs/common';

import { EstimateRouteService } from './application/estimate-route.service';
import { ROUTING_PROVIDER } from './application/routing-provider.token';
import { MockRoutingProvider } from './infrastructure/mock-routing.provider';
import { RouteEstimationController } from './presentation/route-estimation.controller';

@Module({
  controllers: [RouteEstimationController],
  providers: [
    EstimateRouteService,
    MockRoutingProvider,
    {
      provide: ROUTING_PROVIDER,
      useExisting: MockRoutingProvider,
    },
  ],
})
export class RouteEstimationModule {}
