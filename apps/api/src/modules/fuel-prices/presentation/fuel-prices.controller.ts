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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type FuelPriceSuggestionRequest,
  fuelPriceSuggestionRequestSchema,
  type FuelPriceSuggestionResponse,
} from '@route-cost/contracts';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { apiSchemaRef } from '../../../openapi/zod-openapi';
import { VehicleNotFoundExceptionFilter } from '../../vehicles/presentation/vehicle-not-found-exception.filter';
import { SuggestFuelPriceService } from '../application/suggest-fuel-price.service';
import { FuelPriceProviderExceptionFilter } from './fuel-price-provider-exception.filter';

@ApiTags('fuel-price-suggestions')
@Controller('fuel-price-suggestions')
@UseFilters(FuelPriceProviderExceptionFilter, VehicleNotFoundExceptionFilter)
export class FuelPricesController {
  public constructor(
    private readonly suggestFuelPriceService: SuggestFuelPriceService,
  ) {}

  @Post()
  @Version('1')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    description:
      'Request a nearby fuel price suggestion. Send exactly one of vehicleId or fuelProduct. Do not send country; the API resolves it from the coordinate. Spain is the only live country provider initially.',
    schema: apiSchemaRef('FuelPriceSuggestionRequest'),
    examples: {
      catalogVehicle: {
        summary: 'Catalog vehicle',
        value: {
          coordinate: { latitude: 41.387, longitude: 2.17 },
          vehicleId: 'honda-forza-350-2025',
        },
      },
      explicitFuelProduct: {
        summary: 'Explicit fuel product',
        value: {
          coordinate: { latitude: 41.387, longitude: 2.17 },
          fuelProduct: 'petrol-95-e5',
        },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('FuelPriceSuggestionResponse'),
    description:
      'Available suggestion, unsupported-country, country-undetermined, or no-nearby-prices. The suggestion is a nearby median, not the cheapest station.',
  })
  @ApiBadRequestResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Validation error.',
  })
  @ApiNotFoundResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Vehicle not found.',
  })
  @ApiUnprocessableEntityResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Vehicle fuel product unsupported.',
  })
  @ApiServiceUnavailableResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Fuel price provider unavailable.',
  })
  @ApiGatewayTimeoutResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Fuel price provider timeout.',
  })
  @UsePipes(
    new ZodValidationPipe(
      fuelPriceSuggestionRequestSchema,
      'INVALID_FUEL_PRICE_SUGGESTION_REQUEST',
    ),
  )
  public async suggest(
    @Body() request: FuelPriceSuggestionRequest,
  ): Promise<FuelPriceSuggestionResponse> {
    return this.suggestFuelPriceService.suggest({
      coordinate: request.coordinate,
      ...(request.vehicleId === undefined
        ? {}
        : { vehicleId: request.vehicleId }),
      ...(request.fuelProduct === undefined
        ? {}
        : { fuelProduct: request.fuelProduct }),
    });
  }
}
