import { Logger, Module } from '@nestjs/common';
import {
  createValhallaRoutingProvider,
  type RoutingProviderLogger,
  type ValhallaConfig,
} from '@route-cost/routing';

import type { Environment } from '../../config/environment';
import { EnvironmentModule } from '../../config/environment.module';
import { ENVIRONMENT } from '../../config/environment.token';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { EstimateRouteService } from './application/estimate-route.service';
import { EstimateRouteCostService } from './application/estimate-route-cost.service';
import { ROUTING_PROVIDER } from './application/routing-provider.token';
import { MockRoutingProvider } from './infrastructure/mock-routing.provider';
import { toValhallaConfig, VALHALLA_CONFIG } from './infrastructure/valhalla';
import { RouteCostEstimatesController } from './presentation/route-cost-estimates.controller';
import { RouteEstimationController } from './presentation/route-estimation.controller';

@Module({
  imports: [EnvironmentModule, VehiclesModule],
  controllers: [RouteEstimationController, RouteCostEstimatesController],
  providers: [
    EstimateRouteService,
    EstimateRouteCostService,
    MockRoutingProvider,
    {
      provide: VALHALLA_CONFIG,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) => toValhallaConfig(environment),
    },
    {
      provide: ROUTING_PROVIDER,
      inject: [ENVIRONMENT, VALHALLA_CONFIG, MockRoutingProvider],
      useFactory: (
        environment: Environment,
        valhallaConfig: ValhallaConfig,
        mockRoutingProvider: MockRoutingProvider,
      ) =>
        environment.ROUTING_PROVIDER === 'valhalla'
          ? createValhallaRoutingProvider({
              ...valhallaConfig,
              logger: toNestRoutingLogger(),
            })
          : mockRoutingProvider,
    },
  ],
})
export class RouteEstimationModule {}

function toNestRoutingLogger(): RoutingProviderLogger {
  const logger = new Logger('ValhallaRoutingProvider');
  return {
    log: (event) => logger.log(event),
    warn: (event) => logger.warn(event),
  };
}
