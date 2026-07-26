import { Module } from '@nestjs/common';

import { EnvironmentModule } from './config/environment.module';
import { HealthModule } from './modules/health/health.module';
import { RouteEstimationModule } from './modules/route-estimation/route-estimation.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

@Module({
  imports: [
    EnvironmentModule,
    HealthModule,
    RouteEstimationModule,
    VehiclesModule,
  ],
})
export class AppModule {}
