import { Inject, Injectable } from '@nestjs/common';

import {
  STADIA_GEOCODING_CONFIG,
  type StadiaGeocodingConfig,
} from './stadia-geocoding.types';
import { StadiaGeocodingHttpClientCore } from './stadia-geocoding-http.client-core';

@Injectable()
export class StadiaGeocodingHttpClient extends StadiaGeocodingHttpClientCore {
  public constructor(
    @Inject(STADIA_GEOCODING_CONFIG)
    config: StadiaGeocodingConfig,
  ) {
    super(config);
  }
}
