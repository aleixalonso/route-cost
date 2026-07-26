import { Inject, Injectable } from '@nestjs/common';
import type {
  GeocodingProvider,
  ReverseGeocodeRequest,
  ReverseGeocodeResult,
} from '@route-cost/geocoding';

import { GEOCODING_PROVIDER } from '../geocoding-provider.token';
import {
  clampLimit,
  LOCATION_SERVICE_CONFIG,
} from './autocomplete-locations.service';
import type { LocationServiceConfig } from './location-service-config';

@Injectable()
export class ReverseGeocodeService {
  public constructor(
    @Inject(GEOCODING_PROVIDER)
    private readonly geocodingProvider: GeocodingProvider,
    @Inject(LOCATION_SERVICE_CONFIG)
    private readonly config: LocationServiceConfig,
  ) {}

  public reverse(
    request: Partial<ReverseGeocodeRequest> &
      Pick<ReverseGeocodeRequest, 'coordinate'>,
  ): Promise<ReverseGeocodeResult> {
    return this.geocodingProvider.reverseGeocode({
      ...request,
      limit: clampLimit(request.limit, this.config),
      ...(request.countryCode === undefined
        ? {}
        : { countryCode: request.countryCode.toUpperCase() }),
    });
  }
}
