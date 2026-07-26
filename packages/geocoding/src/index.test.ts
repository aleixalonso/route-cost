import { describe, expect, it } from 'vitest';

import {
  assertValidBoundingBox,
  assertValidCoordinate,
  type AutocompleteLocationsRequest,
  GeocodingProviderAuthenticationError,
  GeocodingProviderInvalidResponseError,
  GeocodingProviderRateLimitError,
  GeocodingProviderTimeoutError,
  GeocodingProviderUnavailableError,
  LocationNotFoundError,
  mapProviderLayer,
  mapProviderPrecision,
} from './index.js';

describe('provider layer mapping', () => {
  it.each([
    ['address', 'address'],
    ['street', 'street'],
    ['poi', 'point-of-interest'],
    ['postalcode', 'postal-code'],
    ['neighbourhood', 'neighbourhood'],
    ['locality', 'locality'],
    ['localadmin', 'locality'],
    ['borough', 'locality'],
    ['county', 'county'],
    ['macrocounty', 'county'],
    ['region', 'region'],
    ['macroregion', 'region'],
    ['country', 'country'],
    ['venue', 'other'],
  ] as const)('maps %s to %s', (layer, expected) => {
    expect(mapProviderLayer(layer)).toBe(expected);
  });
});

describe('provider precision mapping', () => {
  it.each([
    ['point', 'point'],
    ['centroid', 'centroid'],
    [undefined, 'unknown'],
    ['interpolated', 'unknown'],
  ] as const)('maps %s to %s', (precision, expected) => {
    expect(mapProviderPrecision(precision)).toBe(expected);
  });
});

describe('geocoding model boundaries', () => {
  it('accepts coordinate boundaries', () => {
    expect(() =>
      assertValidCoordinate({ latitude: -90, longitude: -180 }),
    ).not.toThrow();
    expect(() =>
      assertValidCoordinate({ latitude: 90, longitude: 180 }),
    ).not.toThrow();
  });

  it('rejects invalid coordinates', () => {
    expect(() => assertValidCoordinate({ latitude: 91, longitude: 2 })).toThrow(
      GeocodingProviderInvalidResponseError,
    );
  });

  it('accepts bounding-box boundaries', () => {
    expect(() =>
      assertValidBoundingBox({
        west: -180,
        south: -90,
        east: 180,
        north: 90,
      }),
    ).not.toThrow();
  });

  it('rejects malformed bounding boxes', () => {
    expect(() =>
      assertValidBoundingBox({ west: 3, south: 1, east: 2, north: 4 }),
    ).toThrow(GeocodingProviderInvalidResponseError);
  });
});

describe('provider-neutral requests', () => {
  it('does not expose provider-specific parameters', () => {
    const request: AutocompleteLocationsRequest = {
      query: 'Plaça Cat',
      limit: 5,
      countryCode: 'ES',
      focus: { latitude: 41.387, longitude: 2.17 },
    };

    expect(Object.keys(request)).toEqual([
      'query',
      'limit',
      'countryCode',
      'focus',
    ]);
    expect('layers' in request).toBe(false);
    expect('sources' in request).toBe(false);
    expect('baseUrl' in request).toBe(false);
  });
});

describe('provider-neutral errors', () => {
  it.each([
    [
      new GeocodingProviderAuthenticationError('auth failed', {
        status: 401,
        providerRequestId: 'request-1',
        providerErrorCode: 'auth',
      }),
      'GeocodingProviderAuthenticationError',
    ],
    [
      new GeocodingProviderRateLimitError('rate limited', {
        status: 429,
        providerRequestId: 'request-2',
        providerErrorCode: 'rate_limited',
      }),
      'GeocodingProviderRateLimitError',
    ],
    [
      new GeocodingProviderUnavailableError('unavailable', {
        status: 503,
        providerRequestId: 'request-3',
        providerErrorCode: 'unavailable',
      }),
      'GeocodingProviderUnavailableError',
    ],
    [
      new GeocodingProviderInvalidResponseError('invalid', {
        status: 502,
        providerRequestId: 'request-4',
        providerErrorCode: 'schema_mismatch',
      }),
      'GeocodingProviderInvalidResponseError',
    ],
    [
      new LocationNotFoundError('missing', {
        status: 404,
        providerRequestId: 'request-5',
        providerErrorCode: 'missing',
      }),
      'LocationNotFoundError',
    ],
  ] as const)('sets metadata for %s', (error, name) => {
    expect(error.name).toBe(name);
    expect(error.providerRequestId).toMatch(/^request-/);
    expect(error.providerErrorCode).toBeTruthy();
  });

  it('sets timeout metadata', () => {
    const error = new GeocodingProviderTimeoutError('timeout', {
      providerRequestId: 'request-6',
      providerErrorCode: 'timeout',
    });

    expect(error.name).toBe('GeocodingProviderTimeoutError');
    expect(error.providerRequestId).toBe('request-6');
    expect(error.providerErrorCode).toBe('timeout');
  });
});
