interface ProviderErrorOptions {
  status?: number | undefined;
  providerRequestId?: string | undefined;
  providerErrorCode?: string | undefined;
}

class GeocodingProviderError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(message: string, options: ProviderErrorOptions = {}) {
    super(message);
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class GeocodingProviderAuthenticationError extends GeocodingProviderError {
  public constructor(
    message = 'Geocoding provider authentication failed.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'GeocodingProviderAuthenticationError';
  }
}

export class GeocodingProviderRateLimitError extends GeocodingProviderError {
  public constructor(
    message = 'Geocoding provider rate limit exceeded.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'GeocodingProviderRateLimitError';
  }
}

export class GeocodingProviderTimeoutError extends Error {
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Geocoding provider request timed out.',
    options: Pick<
      ProviderErrorOptions,
      'providerRequestId' | 'providerErrorCode'
    > = {},
  ) {
    super(message);
    this.name = 'GeocodingProviderTimeoutError';
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class GeocodingProviderUnavailableError extends GeocodingProviderError {
  public constructor(
    message = 'Geocoding provider is unavailable.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'GeocodingProviderUnavailableError';
  }
}

export class GeocodingProviderInvalidResponseError extends GeocodingProviderError {
  public constructor(
    message = 'Geocoding provider returned an invalid response.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'GeocodingProviderInvalidResponseError';
  }
}

export class LocationNotFoundError extends GeocodingProviderError {
  public constructor(
    message = 'Location was not found.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'LocationNotFoundError';
  }
}
