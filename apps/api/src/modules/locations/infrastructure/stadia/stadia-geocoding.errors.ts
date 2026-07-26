import {
  GeocodingProviderAuthenticationError,
  GeocodingProviderInvalidResponseError,
  GeocodingProviderRateLimitError,
  GeocodingProviderTimeoutError,
  GeocodingProviderUnavailableError,
  LocationNotFoundError,
} from '@route-cost/geocoding';

interface StadiaGeocodingErrorOptions {
  status?: number | undefined;
  providerRequestId?: string | undefined;
  providerErrorCode?: string | undefined;
}

export class StadiaGeocodingAuthenticationError extends GeocodingProviderAuthenticationError {
  public constructor(options: StadiaGeocodingErrorOptions = {}) {
    super('Stadia geocoding authentication failed.', options);
    this.name = 'StadiaGeocodingAuthenticationError';
  }
}

export class StadiaGeocodingRateLimitError extends GeocodingProviderRateLimitError {
  public constructor(options: StadiaGeocodingErrorOptions = {}) {
    super('Stadia geocoding rate limit exceeded.', options);
    this.name = 'StadiaGeocodingRateLimitError';
  }
}

export class StadiaGeocodingTimeoutError extends GeocodingProviderTimeoutError {
  public constructor(
    options: Pick<
      StadiaGeocodingErrorOptions,
      'providerRequestId' | 'providerErrorCode'
    > = {},
  ) {
    super('Stadia geocoding request timed out.', options);
    this.name = 'StadiaGeocodingTimeoutError';
  }
}

export class StadiaGeocodingUnavailableError extends GeocodingProviderUnavailableError {
  public constructor(options: StadiaGeocodingErrorOptions = {}) {
    super('Stadia geocoding is unavailable.', options);
    this.name = 'StadiaGeocodingUnavailableError';
  }
}

export class StadiaGeocodingInvalidResponseError extends GeocodingProviderInvalidResponseError {
  public constructor(options: StadiaGeocodingErrorOptions = {}) {
    super('Stadia geocoding returned an invalid response.', options);
    this.name = 'StadiaGeocodingInvalidResponseError';
  }
}

export class StadiaLocationNotFoundError extends LocationNotFoundError {
  public constructor(options: StadiaGeocodingErrorOptions = {}) {
    super('Stadia location was not found.', options);
    this.name = 'StadiaLocationNotFoundError';
  }
}
