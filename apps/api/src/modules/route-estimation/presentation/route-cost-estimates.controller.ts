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
import { Throttle } from '@nestjs/throttler';
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

const defaultPreferencesExample = {
  routePreferences: {
    avoidTolls: false,
    avoidMotorways: false,
    avoidFerries: false,
    priority: 'fastest',
  },
};

const avoidTollsPreferencesExample = {
  routePreferences: {
    avoidTolls: true,
    avoidMotorways: false,
    avoidFerries: false,
    priority: 'fastest',
  },
};

const shortestWithoutMotorwaysPreferencesExample = {
  routePreferences: {
    avoidTolls: false,
    avoidMotorways: true,
    avoidFerries: false,
    priority: 'shortest',
  },
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    description:
      'Route request with exactly one vehicle selection mode: vehicleId from the catalog, or custom vehicleCategory with consumptionProfile. Catalog profiles may contain estimated data; full provenance is available from the vehicle detail endpoint.\n\nRoute preferences are optional. Avoidance preferences influence routing but are not absolute guarantees: the returned route is inspected and its actual characteristics are reported per alternative, including when an avoided feature is still present. Requests omitting routePreferences keep the previous behavior and resolve to the documented defaults. Toll presence describes distance, never toll price.',
    schema: {
      examples: {
        catalogVehicle: {
          summary: 'Catalog vehicle with default preferences',
          value: {
            ...catalogRouteCostEstimateExample,
            ...defaultPreferencesExample,
          },
        },
        customProfile: {
          summary: 'Custom profile with default preferences',
          value: {
            ...customRouteCostEstimateExample,
            ...defaultPreferencesExample,
          },
        },
        avoidTolls: {
          summary: 'Avoid toll roads',
          value: {
            ...catalogRouteCostEstimateExample,
            ...avoidTollsPreferencesExample,
          },
        },
        shortestWithoutMotorways: {
          summary: 'Shortest route without motorways',
          value: {
            ...catalogRouteCostEstimateExample,
            ...shortestWithoutMotorwaysPreferencesExample,
          },
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      'Route alternatives with category fuel consumption, estimated cost, observed route characteristics, applied preferences, and per-alternative preference compliance. Characteristics describe the actual returned route; every alternative may differ. Toll presence does not include toll price.',
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
