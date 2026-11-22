export class RoutingProviderAuthenticationError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider authentication failed.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderAuthenticationError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderEndpointNotEntitledError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider endpoint is not included in this account plan.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderEndpointNotEntitledError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderRateLimitError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider rate limit exceeded.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderRateLimitError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderTimeoutError extends Error {
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider request timed out.',
    options: Pick<
      RoutingProviderErrorOptions,
      'providerRequestId' | 'providerErrorCode'
    > = {},
  ) {
    super(message);
    this.name = 'RoutingProviderTimeoutError';
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderUnavailableError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider is unavailable.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderUnavailableError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderInvalidResponseError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider returned an invalid response.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderInvalidResponseError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderRouteNotFoundError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'No route was found.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderRouteNotFoundError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export interface RoutingProviderErrorOptions {
  status?: number | undefined;
  providerRequestId?: string | undefined;
  providerErrorCode?: string | undefined;
}
