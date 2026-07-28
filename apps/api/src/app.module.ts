import { Module } from '@nestjs/common';

import { EnvironmentModule } from './config/environment.module';
import { FuelPricesModule } from './modules/fuel-prices/fuel-prices.module';
import { HealthModule } from './modules/health/health.module';
import { LocationsModule } from './modules/locations/locations.module';
import { RouteEstimationModule } from './modules/route-estimation/route-estimation.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

@Module({
  imports: [
    EnvironmentModule,
    FuelPricesModule,
    HealthModule,
    LocationsModule,
    RouteEstimationModule,
    VehiclesModule,
  ],
})
export class AppModule {}
