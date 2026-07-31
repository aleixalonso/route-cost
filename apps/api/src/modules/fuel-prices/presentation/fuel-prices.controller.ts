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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  type FuelPriceSuggestionRequest,
  fuelPriceSuggestionRequestSchema,
  type FuelPriceSuggestionResponse,
} from '@route-cost/contracts';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
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
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    description:
      'Request a nearby fuel price suggestion. Send exactly one of vehicleId or fuelProduct. Do not send country; the API resolves it from the coordinate. Spain is the only live country provider initially.',
    schema: {
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
    },
  })
  @ApiOkResponse({
    description:
      'Available suggestion, unsupported-country, country-undetermined, or no-nearby-prices. The suggestion is a nearby median, not the cheapest station.',
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiNotFoundResponse({ description: 'Vehicle not found.' })
  @ApiUnprocessableEntityResponse({
    description: 'Vehicle fuel product unsupported.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Fuel price provider unavailable.',
  })
  @ApiGatewayTimeoutResponse({ description: 'Fuel price provider timeout.' })
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
