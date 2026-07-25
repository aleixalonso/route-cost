import {
  RoutingProviderAuthenticationError,
  RoutingProviderInvalidResponseError,
  RoutingProviderRateLimitError,
  RoutingProviderRouteNotFoundError,
  RoutingProviderTimeoutError,
  RoutingProviderUnavailableError,
} from '@route-cost/routing';

interface ValhallaErrorOptions {
  status?: number | undefined;
  providerRequestId?: string | undefined;
  providerErrorCode?: string | undefined;
}

export class ValhallaAuthenticationError extends RoutingProviderAuthenticationError {
  public constructor(options: ValhallaErrorOptions = {}) {
    super('Valhalla authentication failed.', options);
    this.name = 'ValhallaAuthenticationError';
  }
}

export class ValhallaRateLimitError extends RoutingProviderRateLimitError {
  public constructor(options: ValhallaErrorOptions = {}) {
    super('Valhalla rate limit exceeded.', options);
    this.name = 'ValhallaRateLimitError';
  }
}

export class ValhallaTimeoutError extends RoutingProviderTimeoutError {
  public constructor(
    options: Pick<
      ValhallaErrorOptions,
      'providerRequestId' | 'providerErrorCode'
    > = {},
  ) {
    super('Valhalla request timed out.', options);
    this.name = 'ValhallaTimeoutError';
  }
}

export class ValhallaUnavailableError extends RoutingProviderUnavailableError {
  public constructor(options: ValhallaErrorOptions = {}) {
    super('Valhalla is unavailable.', options);
    this.name = 'ValhallaUnavailableError';
  }
}

export class ValhallaInvalidResponseError extends RoutingProviderInvalidResponseError {
  public constructor(options: ValhallaErrorOptions = {}) {
    super('Valhalla returned an invalid response.', options);
    this.name = 'ValhallaInvalidResponseError';
  }
}

export class ValhallaRouteNotFoundError extends RoutingProviderRouteNotFoundError {
  public constructor(options: ValhallaErrorOptions = {}) {
    super('Valhalla could not find a route.', options);
    this.name = 'ValhallaRouteNotFoundError';
  }
}
