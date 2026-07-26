import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { Environment } from '../../config/environment';
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
  imports: [ConfigModule, VehiclesModule],
  controllers: [RouteEstimationController, RouteCostEstimatesController],
  providers: [
    EstimateRouteService,
    EstimateRouteCostService,
    MockRoutingProvider,
    ValhallaHttpClient,
    ValhallaRoutingProvider,
    {
      provide: VALHALLA_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) =>
        toValhallaConfig({
          NODE_ENV: configService.get('NODE_ENV', { infer: true }),
          HOST: configService.get('HOST', { infer: true }),
          PORT: configService.get('PORT', { infer: true }),
          CORS_ORIGINS: configService.get('CORS_ORIGINS', { infer: true }),
          SWAGGER_ENABLED: configService.get('SWAGGER_ENABLED', {
            infer: true,
          }),
          ROUTING_PROVIDER: configService.get('ROUTING_PROVIDER', {
            infer: true,
          }),
          VALHALLA_BASE_URL: configService.get('VALHALLA_BASE_URL', {
            infer: true,
          }),
          VALHALLA_ROUTE_PATH: configService.get('VALHALLA_ROUTE_PATH', {
            infer: true,
          }),
          VALHALLA_TRACE_ATTRIBUTES_PATH: configService.get(
            'VALHALLA_TRACE_ATTRIBUTES_PATH',
            { infer: true },
          ),
          VALHALLA_API_KEY: configService.get('VALHALLA_API_KEY', {
            infer: true,
          }),
          VALHALLA_CLIENT_ID: configService.get('VALHALLA_CLIENT_ID', {
            infer: true,
          }),
          VALHALLA_REQUEST_TIMEOUT_MS: configService.get(
            'VALHALLA_REQUEST_TIMEOUT_MS',
            { infer: true },
          ),
          VALHALLA_MAX_ALTERNATIVES: configService.get(
            'VALHALLA_MAX_ALTERNATIVES',
            { infer: true },
          ),
        }),
    },
    {
      provide: ROUTING_PROVIDER,
      inject: [ConfigService, MockRoutingProvider, ValhallaRoutingProvider],
      useFactory: (
        configService: ConfigService<Environment, true>,
        mockRoutingProvider: MockRoutingProvider,
        valhallaRoutingProvider: ValhallaRoutingProvider,
      ) =>
        configService.get('ROUTING_PROVIDER', { infer: true }) === 'valhalla'
          ? valhallaRoutingProvider
          : mockRoutingProvider,
    },
  ],
})
export class RouteEstimationModule {}
