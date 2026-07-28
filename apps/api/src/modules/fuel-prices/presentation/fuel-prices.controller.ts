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
import type { FuelPriceAvailability } from '../application/suggest-fuel-price.service';
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
    return toResponse(
      await this.suggestFuelPriceService.suggest({
        coordinate: request.coordinate,
        ...(request.vehicleId === undefined
          ? {}
          : { vehicleId: request.vehicleId }),
        ...(request.fuelProduct === undefined
          ? {}
          : { fuelProduct: request.fuelProduct }),
      }),
    );
  }
}

function toResponse(
  availability: FuelPriceAvailability,
): FuelPriceSuggestionResponse {
  switch (availability.status) {
    case 'available':
      return {
        status: 'available',
        country: toCountry(availability.country),
        fuelProduct: availability.fuelProduct,
        suggestion: {
          suggestedPricePerLitre:
            availability.suggestion.suggestedPricePerLitre,
          method: availability.suggestion.method,
          stationCount: availability.suggestion.stationCount,
          radiusMetres: availability.suggestion.radiusMetres,
          minimumPricePerLitre: availability.suggestion.minimumPricePerLitre,
          maximumPricePerLitre: availability.suggestion.maximumPricePerLitre,
          nearestStationDistanceMetres:
            availability.suggestion.nearestStationDistanceMetres,
          farthestStationDistanceMetres:
            availability.suggestion.farthestStationDistanceMetres,
          ...(availability.suggestion.sourceUpdatedAt === undefined
            ? {}
            : { sourceUpdatedAt: availability.suggestion.sourceUpdatedAt }),
          retrievedAt: availability.suggestion.retrievedAt,
          ...(availability.suggestion.oldestPriceUpdatedAt === undefined
            ? {}
            : {
                oldestPriceUpdatedAt:
                  availability.suggestion.oldestPriceUpdatedAt,
              }),
          ...(availability.suggestion.newestPriceUpdatedAt === undefined
            ? {}
            : {
                newestPriceUpdatedAt:
                  availability.suggestion.newestPriceUpdatedAt,
              }),
          isStale: availability.suggestion.isStale,
          ...(availability.suggestion.attribution === undefined
            ? {}
            : { attribution: availability.suggestion.attribution }),
        },
      };
    case 'unsupported-country':
      return {
        status: 'unsupported-country',
        country: toCountry(availability.country),
        fuelProduct: availability.fuelProduct,
      };
    case 'country-undetermined':
      return {
        status: 'country-undetermined',
        fuelProduct: availability.fuelProduct,
      };
    case 'no-nearby-prices':
      return {
        status: 'no-nearby-prices',
        country: toCountry(availability.country),
        fuelProduct: availability.fuelProduct,
        maximumRadiusMetres: availability.maximumRadiusMetres,
      };
  }
}

function toCountry(country: {
  readonly countryCode: string;
  readonly countryName?: string;
}): FuelPriceSuggestionResponse extends infer T
  ? T extends { country: infer Country }
    ? Country
    : never
  : never {
  return {
    code: country.countryCode,
    ...(country.countryName === undefined ? {} : { name: country.countryName }),
  };
}
