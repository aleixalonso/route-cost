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
import { EstimateRouteCostService } from '../application/estimate-route-cost.service';
import { RoutingProviderExceptionFilter } from './routing-provider-exception.filter';

const routeCostEstimateExample = {
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

@ApiTags('route-cost-estimates')
@Controller('route-cost-estimates')
@UseFilters(RoutingProviderExceptionFilter)
export class RouteCostEstimatesController {
  public constructor(
    private readonly estimateRouteCostService: EstimateRouteCostService,
  ) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    description:
      'Route request with illustrative litres-per-100-kilometres consumption rates and fuel price per litre.',
    schema: {
      example: routeCostEstimateExample,
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
