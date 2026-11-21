import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { EnvironmentModule } from './config/environment.module';
import { FuelPricesModule } from './modules/fuel-prices/fuel-prices.module';
import { HealthModule } from './modules/health/health.module';
import { LocationsModule } from './modules/locations/locations.module';
import { RouteEstimationModule } from './modules/route-estimation/route-estimation.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

@Module({
  imports: [
    EnvironmentModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    FuelPricesModule,
    HealthModule,
    LocationsModule,
    RouteEstimationModule,
    VehiclesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
