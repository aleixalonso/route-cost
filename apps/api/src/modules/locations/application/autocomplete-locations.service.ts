import { Inject, Injectable } from '@nestjs/common';
import type {
  AutocompleteLocationsRequest,
  AutocompleteLocationsResult,
  GeocodingProvider,
} from '@route-cost/geocoding';

import { GEOCODING_PROVIDER } from '../geocoding-provider.token';
import type { LocationServiceConfig } from './location-service-config';

export const LOCATION_SERVICE_CONFIG = Symbol('LOCATION_SERVICE_CONFIG');

@Injectable()
export class AutocompleteLocationsService {
  public constructor(
    @Inject(GEOCODING_PROVIDER)
    private readonly geocodingProvider: GeocodingProvider,
    @Inject(LOCATION_SERVICE_CONFIG)
    private readonly config: LocationServiceConfig,
  ) {}

  public autocomplete(
    request: Partial<AutocompleteLocationsRequest> &
      Pick<AutocompleteLocationsRequest, 'query'>,
  ): Promise<AutocompleteLocationsResult> {
    return this.geocodingProvider.autocompleteLocations({
      ...request,
      limit: clampLimit(request.limit, this.config),
      ...(request.countryCode === undefined
        ? {}
        : { countryCode: request.countryCode.toUpperCase() }),
    });
  }
}

export function clampLimit(
  limit: number | undefined,
  config: LocationServiceConfig,
): number {
  return Math.min(limit ?? config.defaultLimit, config.maxLimit);
}
