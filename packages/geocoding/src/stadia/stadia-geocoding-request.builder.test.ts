import { describe, expect, it } from 'vitest';

import { StadiaGeocodingInvalidResponseError } from './stadia-geocoding.errors.js';
import type { StadiaGeocodingConfig } from './stadia-geocoding-config.js';
import {
  buildAutocompleteUrl,
  buildPlaceDetailsUrl,
  buildReverseUrl,
  buildSearchUrl,
} from './stadia-geocoding-request.builder.js';

const config: StadiaGeocodingConfig = {
  baseUrl: 'https://api-eu.stadiamaps.com',
  autocompletePath: '/geocoding/v2/autocomplete',
  searchPath: '/geocoding/v2/search',
  placeDetailsPath: '/geocoding/v2/place_details',
  reversePath: '/geocoding/v2/reverse',
  apiKey: 'secret-key',
  clientId: 'route-cost',
  requestTimeoutMs: 5_000,
  defaultLimit: 5,
  maxLimit: 10,
};

describe('Stadia geocoding request builder', () => {
  it('builds autocomplete with text, limit, language, country, focus and fixed layers', () => {
    const url = buildAutocompleteUrl(
      {
        query: 'Plaça Cat',
        limit: 7,
        language: 'ca',
        countryCode: 'es',
        focus: { latitude: 41.387, longitude: 2.17 },
      },
      config,
    );

    expect(url.pathname).toBe('/geocoding/v2/autocomplete');
    expect(url.searchParams.get('text')).toBe('Plaça Cat');
    expect(url.search).toContain('Pla%C3%A7a');
    expect(url.searchParams.get('size')).toBe('7');
    expect(url.searchParams.get('lang')).toBe('ca');
    expect(url.searchParams.get('boundary.country')).toBe('ES');
    expect(url.searchParams.get('focus.point.lat')).toBe('41.387');
    expect(url.searchParams.get('focus.point.lon')).toBe('2.17');
    expect(url.searchParams.get('layers')).toBe(
      'address,street,poi,locality,region,country',
    );
    expect(url.searchParams.get('client_id')).toBe('route-cost');
    expect(url.toString()).not.toContain('secret-key');
    expect(url.searchParams.has('undefined')).toBe(false);
  });

  it('builds forward search without a layer filter', () => {
    const url = buildSearchUrl(
      {
        query: 'Plaça de Catalunya, Barcelona',
        limit: 5,
        language: 'es-ES',
        countryCode: 'ES',
        focus: { latitude: 41.387, longitude: 2.17 },
      },
      config,
    );

    expect(url.pathname).toBe('/geocoding/v2/search');
    expect(url.searchParams.get('layers')).toBeNull();
    expect(url.searchParams.get('boundary.country')).toBe('ES');
    expect(url.searchParams.get('focus.point.lon')).toBe('2.17');
  });

  it('builds place details with one encoded opaque ID', () => {
    const url = buildPlaceDetailsUrl(
      { placeId: 'stadia:place/with:separators', language: 'ca' },
      config,
    );

    expect(url.pathname).toBe('/geocoding/v2/place_details');
    expect(url.searchParams.get('ids')).toBe('stadia:place/with:separators');
    expect(url.search).toContain('stadia%3Aplace%2Fwith%3Aseparators');
    expect(url.searchParams.get('lang')).toBe('ca');
    expect(url.toString()).not.toContain('secret-key');
  });

  it('rejects control characters before place-details construction', () => {
    expect(() => buildPlaceDetailsUrl({ placeId: 'bad\nid' }, config)).toThrow(
      StadiaGeocodingInvalidResponseError,
    );
  });

  it('builds reverse with coordinates, limit, language, country and fixed layers', () => {
    const url = buildReverseUrl(
      {
        coordinate: { latitude: 41.387, longitude: 2.17 },
        limit: 12,
        language: 'ca',
        countryCode: 'es',
      },
      config,
    );

    expect(url.pathname).toBe('/geocoding/v2/reverse');
    expect(url.searchParams.get('point.lat')).toBe('41.387');
    expect(url.searchParams.get('point.lon')).toBe('2.17');
    expect(url.searchParams.get('size')).toBe('10');
    expect(url.searchParams.get('lang')).toBe('ca');
    expect(url.searchParams.get('boundary.country')).toBe('ES');
    expect(url.searchParams.get('layers')).toBe('address,street,poi,locality');
  });
});
