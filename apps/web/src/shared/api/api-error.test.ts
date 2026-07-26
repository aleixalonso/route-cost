import { describe, expect, it } from 'vitest';

import {
  ApiRequestError,
  getOperationErrorMessage,
  isAbortError,
  isApiError,
  toApiError,
} from './api-error';

describe('api errors', () => {
  it('recognizes known backend codes', () => {
    const error = new ApiRequestError({
      status: 404,
      code: 'ROUTE_NOT_FOUND',
      message: 'No route.',
    });

    expect(isApiError(error)).toBe(true);
    expect(getOperationErrorMessage(error, 'route-cost')).toBe(
      'No suitable route could be found between these locations.',
    );
  });

  it('maps vehicle, timeout, provider, unknown, network, and abort errors', () => {
    expect(
      getOperationErrorMessage(
        { status: 404, code: 'VEHICLE_NOT_FOUND', message: 'Missing' },
        'route-cost',
      ),
    ).toContain('selected vehicle');
    expect(
      getOperationErrorMessage(
        { status: 504, code: 'ROUTING_PROVIDER_TIMEOUT', message: 'Timeout' },
        'route-cost',
      ),
    ).toContain('took too long');
    expect(
      getOperationErrorMessage(
        {
          status: 503,
          code: 'GEOCODING_PROVIDER_UNAVAILABLE',
          message: 'Unavailable',
        },
        'autocomplete',
      ),
    ).toContain('Location search');
    expect(
      getOperationErrorMessage(new Error('offline'), 'vehicles'),
    ).toContain('Vehicle catalog');
    const abortError = new DOMException('Aborted', 'AbortError');
    expect(isAbortError(abortError)).toBe(true);
    expect(toApiError(abortError)).toMatchObject({ code: 'REQUEST_ABORTED' });
  });

  it('maps details, validation, and generic route failures', () => {
    expect(
      getOperationErrorMessage(
        { status: 404, code: 'LOCATION_NOT_FOUND', message: 'Missing' },
        'details',
      ),
    ).toContain('could not be resolved');
    expect(
      getOperationErrorMessage(
        {
          status: 400,
          code: 'INVALID_ROUTE_COST_REQUEST',
          message: 'Invalid',
        },
        'route-cost',
      ),
    ).toContain('Check the route');
    expect(
      getOperationErrorMessage(
        {
          status: 502,
          code: 'ROUTING_PROVIDER_INVALID_RESPONSE',
          message: 'Bad',
        },
        'route-cost',
      ),
    ).toContain('temporarily unavailable');
    expect(getOperationErrorMessage('bad', 'route-cost')).toContain(
      'Something went wrong',
    );
  });
});
