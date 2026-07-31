import { describe, expect, it } from 'vitest';

import { toStadiaGeocodingConfig } from './stadia-geocoding.types';

describe('toStadiaGeocodingConfig', () => {
  it('maps the stadia environment subset', () => {
    expect(
      toStadiaGeocodingConfig({
        STADIA_GEOCODING_BASE_URL: 'https://example.com',
        STADIA_GEOCODING_AUTOCOMPLETE_PATH: '/geocoding/v2/autocomplete',
        STADIA_GEOCODING_SEARCH_PATH: '/geocoding/v2/search',
        STADIA_GEOCODING_PLACE_DETAILS_PATH: '/geocoding/v2/place_details',
        STADIA_GEOCODING_REVERSE_PATH: '/geocoding/v2/reverse',
        STADIA_GEOCODING_API_KEY: 'test-key',
        STADIA_GEOCODING_CLIENT_ID: 'test-client',
        STADIA_GEOCODING_REQUEST_TIMEOUT_MS: 5_000,
        STADIA_GEOCODING_DEFAULT_LIMIT: 5,
        STADIA_GEOCODING_MAX_LIMIT: 10,
      }),
    ).toEqual({
      baseUrl: 'https://example.com',
      autocompletePath: '/geocoding/v2/autocomplete',
      searchPath: '/geocoding/v2/search',
      placeDetailsPath: '/geocoding/v2/place_details',
      reversePath: '/geocoding/v2/reverse',
      apiKey: 'test-key',
      clientId: 'test-client',
      requestTimeoutMs: 5_000,
      defaultLimit: 5,
      maxLimit: 10,
    });
  });
});
