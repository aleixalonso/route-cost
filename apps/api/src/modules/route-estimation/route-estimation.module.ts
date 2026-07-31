import { Module } from '@nestjs/common';

import type { Environment } from '../../config/environment';
import { EnvironmentModule } from '../../config/environment.module';
import { ENVIRONMENT } from '../../config/environment.token';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { EstimateRouteService } from './application/estimate-route.service';
import { EstimateRouteCostService } from './application/estimate-route-cost.service';
import { ROUTING_PROVIDER } from './application/routing-provider.token';
import { MockRoutingProvider } from './infrastructure/mock-routing.provider';
import {
  toValhallaConfig,
  VALHALLA_CONFIG,
  ValhallaHttpClient,
  ValhallaRoutingProvider,
} from './infrastructure/valhalla';
import { RouteCostEstimatesController } from './presentation/route-cost-estimates.controller';
import { RouteEstimationController } from './presentation/route-estimation.controller';

@Module({
  imports: [EnvironmentModule, VehiclesModule],
  controllers: [RouteEstimationController, RouteCostEstimatesController],
  providers: [
    EstimateRouteService,
    EstimateRouteCostService,
    MockRoutingProvider,
    ValhallaHttpClient,
    ValhallaRoutingProvider,
    {
      provide: VALHALLA_CONFIG,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) => toValhallaConfig(environment),
    },
    {
      provide: ROUTING_PROVIDER,
      inject: [ENVIRONMENT, MockRoutingProvider, ValhallaRoutingProvider],
      useFactory: (
        environment: Environment,
        mockRoutingProvider: MockRoutingProvider,
        valhallaRoutingProvider: ValhallaRoutingProvider,
      ) =>
        environment.ROUTING_PROVIDER === 'valhalla'
          ? valhallaRoutingProvider
          : mockRoutingProvider,
    },
  ],
})
export class RouteEstimationModule {}
