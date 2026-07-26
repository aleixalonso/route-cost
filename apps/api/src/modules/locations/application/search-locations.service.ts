import { Inject, Injectable } from '@nestjs/common';
import type {
  GeocodingProvider,
  SearchLocationsRequest,
  SearchLocationsResult,
} from '@route-cost/geocoding';

import { GEOCODING_PROVIDER } from '../geocoding-provider.token';
import {
  clampLimit,
  LOCATION_SERVICE_CONFIG,
} from './autocomplete-locations.service';
import type { LocationServiceConfig } from './location-service-config';

@Injectable()
export class SearchLocationsService {
  public constructor(
    @Inject(GEOCODING_PROVIDER)
    private readonly geocodingProvider: GeocodingProvider,
    @Inject(LOCATION_SERVICE_CONFIG)
    private readonly config: LocationServiceConfig,
  ) {}

  public search(
    request: Partial<SearchLocationsRequest> &
      Pick<SearchLocationsRequest, 'query'>,
  ): Promise<SearchLocationsResult> {
    return this.geocodingProvider.searchLocations({
      ...request,
      limit: clampLimit(request.limit, this.config),
      ...(request.countryCode === undefined
        ? {}
        : { countryCode: request.countryCode.toUpperCase() }),
    });
  }
}
