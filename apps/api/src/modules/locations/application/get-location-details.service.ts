import { Inject, Injectable } from '@nestjs/common';
import type {
  GeocodingProvider,
  GetLocationDetailsRequest,
  LocationDetailsResult,
} from '@route-cost/geocoding';

import { GEOCODING_PROVIDER } from '../geocoding-provider.token';

@Injectable()
export class GetLocationDetailsService {
  public constructor(
    @Inject(GEOCODING_PROVIDER)
    private readonly geocodingProvider: GeocodingProvider,
  ) {}

  public getDetails(
    request: GetLocationDetailsRequest,
  ): Promise<LocationDetailsResult> {
    return this.geocodingProvider.getLocationDetails(request);
  }
}
