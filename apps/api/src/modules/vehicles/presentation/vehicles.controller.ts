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
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type {
  VehicleDetailResponse,
  VehicleListQuery,
  VehicleListResponse,
} from '@route-cost/contracts';
import { vehicleListQuerySchema } from '@route-cost/contracts';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { apiSchemaRef, ApiZodQuery } from '../../../openapi/zod-openapi';
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
  @ApiZodQuery(vehicleListQuerySchema)
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('VehicleListResponse'),
    description: 'Curated vehicle catalog entries.',
  })
  @ApiBadRequestResponse({
    description: 'Validation error.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @UsePipes(
    new ZodValidationPipe(vehicleListQuerySchema, 'INVALID_VEHICLE_QUERY'),
  )
  public list(@Query() query: VehicleListQuery): VehicleListResponse {
    return this.listVehiclesService.list(query);
  }

  @Get(':vehicleId')
  @Version('1')
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('VehicleDetailResponse'),
    description: 'Complete curated vehicle catalog entry.',
  })
  @ApiNotFoundResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Vehicle not found.',
  })
  public get(@Param('vehicleId') vehicleId: string): VehicleDetailResponse {
    return this.getVehicleService.get(vehicleId);
  }
}
