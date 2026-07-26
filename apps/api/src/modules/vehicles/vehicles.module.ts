import { Module } from '@nestjs/common';

import { GetVehicleService } from './application/get-vehicle.service';
import { ListVehiclesService } from './application/list-vehicles.service';
import { ResolveVehicleSelectionService } from './application/resolve-vehicle-selection.service';
import { StaticVehicleCatalogAdapter } from './infrastructure/static-vehicle-catalog.adapter';
import { VehiclesController } from './presentation/vehicles.controller';
import { VEHICLE_CATALOG } from './vehicle-catalog.token';

@Module({
  controllers: [VehiclesController],
  providers: [
    GetVehicleService,
    ListVehiclesService,
    ResolveVehicleSelectionService,
    StaticVehicleCatalogAdapter,
    {
      provide: VEHICLE_CATALOG,
      useExisting: StaticVehicleCatalogAdapter,
    },
  ],
  exports: [ResolveVehicleSelectionService, VEHICLE_CATALOG],
})
export class VehiclesModule {}
