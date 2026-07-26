import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
  UsePipes,
  Version,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiGatewayTimeoutResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  type EstimateRouteCostRequest,
  estimateRouteCostRequestSchema,
  type EstimateRouteCostResponse,
} from '@route-cost/contracts';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { VehicleNotFoundExceptionFilter } from '../../vehicles/presentation/vehicle-not-found-exception.filter';
import { EstimateRouteCostService } from '../application/estimate-route-cost.service';
import { RoutingProviderExceptionFilter } from './routing-provider-exception.filter';

const customRouteCostEstimateExample = {
  origin: { latitude: 41.3902, longitude: 2.154 },
  destination: { latitude: 41.5912, longitude: 1.5209 },
  vehicleCategory: 'maxi-scooter',
  consumptionProfile: {
    urbanLitresPer100Km: 3.8,
    interurbanLitresPer100Km: 3.0,
    motorwayLitresPer100Km: 4.1,
    unknownLitresPer100Km: 3.4,
  },
  fuelPrice: {
    amountPerLitre: 1.6,
    currency: 'EUR',
  },
  alternatives: 1,
};

const catalogRouteCostEstimateExample = {
  origin: { latitude: 41.3902, longitude: 2.154 },
  destination: { latitude: 41.5912, longitude: 1.5209 },
  vehicleId: 'honda-forza-350-2025',
  fuelPrice: {
    amountPerLitre: 1.6,
    currency: 'EUR',
  },
  alternatives: 1,
};

@ApiTags('route-cost-estimates')
@Controller('route-cost-estimates')
@UseFilters(RoutingProviderExceptionFilter, VehicleNotFoundExceptionFilter)
export class RouteCostEstimatesController {
  public constructor(
    private readonly estimateRouteCostService: EstimateRouteCostService,
  ) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    description:
      'Route request with exactly one vehicle selection mode: vehicleId from the catalog, or custom vehicleCategory with consumptionProfile. Catalog profiles may contain estimated data; full provenance is available from the vehicle detail endpoint.',
    schema: {
      examples: {
        catalogVehicle: {
          summary: 'Catalog vehicle',
          value: catalogRouteCostEstimateExample,
        },
        customProfile: {
          summary: 'Custom profile',
          value: customRouteCostEstimateExample,
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      'Route alternatives with category fuel consumption and estimated cost.',
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiNotFoundResponse({ description: 'Route not found.' })
  @ApiServiceUnavailableResponse({
    description: 'Routing provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({ description: 'Routing provider timeout.' })
  @UsePipes(
    new ZodValidationPipe(
      estimateRouteCostRequestSchema,
      'INVALID_ROUTE_COST_REQUEST',
    ),
  )
  public estimate(
    @Body() request: EstimateRouteCostRequest,
  ): Promise<EstimateRouteCostResponse> {
    return this.estimateRouteCostService.estimate(request);
  }
}
