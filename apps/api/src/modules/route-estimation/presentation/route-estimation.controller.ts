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
import type {
  EstimateRouteRequest,
  EstimateRouteResponse,
} from '@route-cost/contracts';
import { estimateRouteRequestSchema } from '@route-cost/contracts';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { EstimateRouteService } from '../application/estimate-route.service';
import { RoutingProviderExceptionFilter } from './routing-provider-exception.filter';

@ApiTags('routes')
@Controller('routes')
@UseFilters(RoutingProviderExceptionFilter)
export class RouteEstimationController {
  public constructor(
    private readonly estimateRouteService: EstimateRouteService,
  ) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    schema: {
      example: {
        origin: { latitude: 41.3902, longitude: 2.154 },
        destination: { latitude: 41.5912, longitude: 1.5209 },
        vehicleCategory: 'maxi-scooter',
        alternatives: 1,
      },
    },
  })
  @ApiOkResponse({
    description: 'Normalized route alternatives.',
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiNotFoundResponse({ description: 'Route not found.' })
  @ApiServiceUnavailableResponse({
    description: 'Routing provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({ description: 'Routing provider timeout.' })
  @UsePipes(new ZodValidationPipe(estimateRouteRequestSchema))
  public estimate(
    @Body() request: EstimateRouteRequest,
  ): Promise<EstimateRouteResponse> {
    return this.estimateRouteService.estimate(request);
  }
}
