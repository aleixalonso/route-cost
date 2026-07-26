export interface ApiError {
  readonly status: number;
  readonly code?: string | undefined;
  readonly message: string;
}

export class ApiRequestError extends Error implements ApiError {
  public readonly status: number;
  public readonly code?: string | undefined;

  public constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.status = error.status;
    this.code = error.code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (isAbortError(error)) {
    return {
      status: 0,
      code: 'REQUEST_ABORTED',
      message: 'Request was cancelled.',
    };
  }

  if (error instanceof Error) {
    return {
      status: 0,
      message: error.message,
    };
  }

  return {
    status: 0,
    message: 'Unexpected request failure.',
  };
}

export function getOperationErrorMessage(
  error: unknown,
  operation: 'autocomplete' | 'details' | 'route-cost' | 'vehicles',
): string {
  const apiError = toApiError(error);

  switch (apiError.code) {
    case 'LOCATION_NOT_FOUND':
      return 'This location could not be resolved. Choose another result.';
    case 'GEOCODING_PROVIDER_RATE_LIMITED':
    case 'GEOCODING_PROVIDER_UNAVAILABLE':
    case 'GEOCODING_PROVIDER_TIMEOUT':
      return operation === 'details'
        ? 'This location could not be resolved. Choose another result.'
        : 'Location search is temporarily unavailable.';
    case 'ROUTE_NOT_FOUND':
      return 'No suitable route could be found between these locations.';
    case 'VEHICLE_NOT_FOUND':
      return 'The selected vehicle is no longer available. Choose another vehicle.';
    case 'ROUTING_PROVIDER_TIMEOUT':
      return 'The route calculation took too long. Try again.';
    case 'ROUTING_PROVIDER_RATE_LIMITED':
    case 'ROUTING_PROVIDER_UNAVAILABLE':
    case 'ROUTING_PROVIDER_INVALID_RESPONSE':
      return 'Route calculation is temporarily unavailable. Try again.';
    case 'INVALID_ROUTE_COST_REQUEST':
      return 'Check the route and vehicle details before calculating.';
    case 'INVALID_LOCATION_QUERY':
      return 'Enter at least three characters to search.';
    default:
      if (operation === 'vehicles') {
        return 'Vehicle catalog is temporarily unavailable.';
      }

      if (operation === 'autocomplete') {
        return 'Location search is temporarily unavailable.';
      }

      return 'Something went wrong. Try again.';
  }
}
