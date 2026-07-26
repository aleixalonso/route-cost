import {
  Controller,
  Get,
  Param,
  Query,
  UseFilters,
  UsePipes,
  Version,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type {
  VehicleDetailResponse,
  VehicleListQuery,
  VehicleListResponse,
} from '@route-cost/contracts';
import { vehicleListQuerySchema } from '@route-cost/contracts';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { GetVehicleService } from '../application/get-vehicle.service';
import { ListVehiclesService } from '../application/list-vehicles.service';
import { VehicleNotFoundExceptionFilter } from './vehicle-not-found-exception.filter';

@ApiTags('vehicles')
@Controller('vehicles')
@UseFilters(VehicleNotFoundExceptionFilter)
export class VehiclesController {
  public constructor(
    private readonly listVehiclesService: ListVehiclesService,
    private readonly getVehicleService: GetVehicleService,
  ) {}

  @Get()
  @Version('1')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'manufacturer', required: false })
  @ApiQuery({ name: 'vehicleCategory', required: false })
  @ApiQuery({ name: 'fuelType', required: false })
  @ApiQuery({ name: 'powertrainType', required: false })
  @ApiOkResponse({ description: 'Curated vehicle catalog entries.' })
  @UsePipes(
    new ZodValidationPipe(vehicleListQuerySchema, 'INVALID_VEHICLE_QUERY'),
  )
  public list(@Query() query: VehicleListQuery): VehicleListResponse {
    return this.listVehiclesService.list(query);
  }

  @Get(':vehicleId')
  @Version('1')
  @ApiOkResponse({ description: 'Complete curated vehicle catalog entry.' })
  @ApiNotFoundResponse({ description: 'Vehicle not found.' })
  public get(@Param('vehicleId') vehicleId: string): VehicleDetailResponse {
    return this.getVehicleService.get(vehicleId);
  }
}
