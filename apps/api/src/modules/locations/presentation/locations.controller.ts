import {
  Controller,
  Get,
  Query,
  UseFilters,
  UsePipes,
  Version,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiGatewayTimeoutResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type AutocompleteLocationsQuery,
  autocompleteLocationsQuerySchema,
  type AutocompleteLocationsResponse,
  type LocationDetailsQuery,
  locationDetailsQuerySchema,
  type LocationDetailsResponse,
  type ReverseGeocodeQuery,
  reverseGeocodeQuerySchema,
  type ReverseGeocodeResponse,
  type SearchLocationsQuery,
  searchLocationsQuerySchema,
  type SearchLocationsResponse,
} from '@route-cost/contracts';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { apiSchemaRef, ApiZodQuery } from '../../../openapi/zod-openapi';
import { AutocompleteLocationsService } from '../application/autocomplete-locations.service';
import { GetLocationDetailsService } from '../application/get-location-details.service';
import { ReverseGeocodeService } from '../application/reverse-geocode.service';
import { SearchLocationsService } from '../application/search-locations.service';
import { GeocodingProviderExceptionFilter } from './geocoding-provider-exception.filter';

@ApiTags('locations')
@Controller('locations')
@UseFilters(GeocodingProviderExceptionFilter)
export class LocationsController {
  public constructor(
    private readonly autocompleteLocationsService: AutocompleteLocationsService,
    private readonly searchLocationsService: SearchLocationsService,
    private readonly getLocationDetailsService: GetLocationDetailsService,
    private readonly reverseGeocodeService: ReverseGeocodeService,
  ) {}

  @Get('autocomplete')
  @Version('1')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiZodQuery(autocompleteLocationsQuerySchema, {
    query: 'Plaça Cat',
    limit: 5,
    language: 'ca',
    countryCode: 'ES',
    focusLatitude: 41.387,
    focusLongitude: 2.17,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('AutocompleteLocationsResponse'),
    description:
      'Autocomplete suggestions. Suggestions do not contain coordinates; call details after selection.',
  })
  @ApiBadRequestResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Validation error.',
  })
  @ApiServiceUnavailableResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Location provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Location provider timeout.',
  })
  @UsePipes(
    new ZodValidationPipe(
      autocompleteLocationsQuerySchema,
      'INVALID_LOCATION_QUERY',
    ),
  )
  public autocomplete(
    @Query() query: AutocompleteLocationsQuery,
  ): Promise<AutocompleteLocationsResponse> {
    return this.autocompleteLocationsService.autocomplete({
      query: query.query,
      ...(query.limit === undefined ? {} : { limit: query.limit }),
      ...(query.language === undefined ? {} : { language: query.language }),
      ...(query.countryCode === undefined
        ? {}
        : { countryCode: query.countryCode }),
      ...(query.focusLatitude === undefined ||
      query.focusLongitude === undefined
        ? {}
        : {
            focus: {
              latitude: query.focusLatitude,
              longitude: query.focusLongitude,
            },
          }),
    });
  }

  @Get('search')
  @Version('1')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiZodQuery(searchLocationsQuerySchema, { query: 'Plaça de Catalunya' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('SearchLocationsResponse'),
    description:
      'Complete location search. Search results contain coordinates directly.',
  })
  @ApiBadRequestResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Validation error.',
  })
  @ApiServiceUnavailableResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Location provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Location provider timeout.',
  })
  @UsePipes(
    new ZodValidationPipe(searchLocationsQuerySchema, 'INVALID_LOCATION_QUERY'),
  )
  public search(
    @Query() query: SearchLocationsQuery,
  ): Promise<SearchLocationsResponse> {
    return this.searchLocationsService.search({
      query: query.query,
      ...(query.limit === undefined ? {} : { limit: query.limit }),
      ...(query.language === undefined ? {} : { language: query.language }),
      ...(query.countryCode === undefined
        ? {}
        : { countryCode: query.countryCode }),
      ...(query.focusLatitude === undefined ||
      query.focusLongitude === undefined
        ? {}
        : {
            focus: {
              latitude: query.focusLatitude,
              longitude: query.focusLongitude,
            },
          }),
    });
  }

  @Get('details')
  @Version('1')
  @Throttle({ default: { limit: 80, ttl: 60_000 } })
  @ApiZodQuery(locationDetailsQuerySchema, {
    placeId: 'provider-gid',
    language: 'ca',
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('LocationDetailsResponse'),
    description:
      'Resolved place details. Routing endpoints continue accepting selected coordinates rather than text.',
  })
  @ApiBadRequestResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Validation error.',
  })
  @ApiNotFoundResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Location not found.',
  })
  @ApiServiceUnavailableResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Location provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Location provider timeout.',
  })
  @UsePipes(
    new ZodValidationPipe(locationDetailsQuerySchema, 'INVALID_LOCATION_QUERY'),
  )
  public details(
    @Query() query: LocationDetailsQuery,
  ): Promise<LocationDetailsResponse> {
    return this.getLocationDetailsService.getDetails({
      placeId: query.placeId,
      ...(query.language === undefined ? {} : { language: query.language }),
    });
  }

  @Get('reverse')
  @Version('1')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiZodQuery(reverseGeocodeQuerySchema, { latitude: 41.387, longitude: 2.17 })
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('ReverseGeocodeResponse'),
    description:
      'Reverse geocoding results near coordinates. Results include attribution.',
  })
  @ApiBadRequestResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Validation error.',
  })
  @ApiServiceUnavailableResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Location provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({
    schema: apiSchemaRef('ErrorResponse'),
    description: 'Location provider timeout.',
  })
  @UsePipes(
    new ZodValidationPipe(reverseGeocodeQuerySchema, 'INVALID_LOCATION_QUERY'),
  )
  public reverse(
    @Query() query: ReverseGeocodeQuery,
  ): Promise<ReverseGeocodeResponse> {
    return this.reverseGeocodeService.reverse({
      coordinate: { latitude: query.latitude, longitude: query.longitude },
      ...(query.limit === undefined ? {} : { limit: query.limit }),
      ...(query.language === undefined ? {} : { language: query.language }),
      ...(query.countryCode === undefined
        ? {}
        : { countryCode: query.countryCode }),
    });
  }
}
