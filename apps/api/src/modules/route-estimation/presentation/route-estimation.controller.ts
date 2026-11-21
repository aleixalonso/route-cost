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
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type {
  EstimateRouteRequest,
  EstimateRouteResponse,
} from '@route-cost/contracts';
import { estimateRouteRequestSchema } from '@route-cost/contracts';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { apiSchemaRef } from '../../../openapi/zod-openapi';
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
    schema: apiSchemaRef('EstimateRouteRequest'),
    examples: {
      default: {
        summary: 'Route request',
        value: {
          origin: { latitude: 41.3902, longitude: 2.154 },
          destination: { latitude: 41.5912, longitude: 1.5209 },
          vehicleCategory: 'maxi-scooter',
          alternatives: 1,
        },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('EstimateRouteResponse'),
    description: 'Normalized route alternatives.',
  })
  @ApiBadRequestResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Validation error.',
  })
  @ApiNotFoundResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Route not found.',
  })
  @ApiServiceUnavailableResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Routing provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Routing provider timeout.',
  })
  @UsePipes(new ZodValidationPipe(estimateRouteRequestSchema))
  public estimate(
    @Body() request: EstimateRouteRequest,
  ): Promise<EstimateRouteResponse> {
    return this.estimateRouteService.estimate(request);
  }
}
