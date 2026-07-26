import {
  Controller,
  Get,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
  Version,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiGatewayTimeoutResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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
import { AutocompleteLocationsService } from '../application/autocomplete-locations.service';
import { GetLocationDetailsService } from '../application/get-location-details.service';
import { ReverseGeocodeService } from '../application/reverse-geocode.service';
import { SearchLocationsService } from '../application/search-locations.service';
import { GeocodingProviderExceptionFilter } from './geocoding-provider-exception.filter';

@ApiTags('locations')
@Controller('locations')
@UseFilters(GeocodingProviderExceptionFilter)
@UseGuards(ThrottlerGuard)
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
  @ApiQuery({ name: 'query', required: true, example: 'Plaça Cat' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiQuery({ name: 'language', required: false, example: 'ca' })
  @ApiQuery({ name: 'countryCode', required: false, example: 'ES' })
  @ApiQuery({ name: 'focusLatitude', required: false, example: 41.387 })
  @ApiQuery({ name: 'focusLongitude', required: false, example: 2.17 })
  @ApiOkResponse({
    description:
      'Autocomplete suggestions. Suggestions do not contain coordinates; call details after selection.',
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiServiceUnavailableResponse({
    description: 'Location provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({ description: 'Location provider timeout.' })
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
  @ApiQuery({ name: 'query', required: true, example: 'Plaça de Catalunya' })
  @ApiOkResponse({
    description:
      'Complete location search. Search results contain coordinates directly.',
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiServiceUnavailableResponse({
    description: 'Location provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({ description: 'Location provider timeout.' })
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
  @ApiQuery({ name: 'placeId', required: true, example: 'provider-gid' })
  @ApiQuery({ name: 'language', required: false, example: 'ca' })
  @ApiOkResponse({
    description:
      'Resolved place details. Routing endpoints continue accepting selected coordinates rather than text.',
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiNotFoundResponse({ description: 'Location not found.' })
  @ApiServiceUnavailableResponse({
    description: 'Location provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({ description: 'Location provider timeout.' })
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
  @ApiQuery({ name: 'latitude', required: true, example: 41.387 })
  @ApiQuery({ name: 'longitude', required: true, example: 2.17 })
  @ApiOkResponse({
    description:
      'Reverse geocoding results near coordinates. Results include attribution.',
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiServiceUnavailableResponse({
    description: 'Location provider unavailable or rate limited.',
  })
  @ApiGatewayTimeoutResponse({ description: 'Location provider timeout.' })
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
