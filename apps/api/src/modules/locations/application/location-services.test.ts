import type {
  GeocodedLocation,
  GeocodingProvider,
} from '@route-cost/geocoding';
import { describe, expect, it, vi } from 'vitest';

import { AutocompleteLocationsService } from './autocomplete-locations.service';
import { GetLocationDetailsService } from './get-location-details.service';
import { ReverseGeocodeService } from './reverse-geocode.service';
import { SearchLocationsService } from './search-locations.service';

const attribution = { url: 'https://stadiamaps.com/attribution/' };
const location: GeocodedLocation = {
  id: 'mock:placa-catalunya',
  name: 'Plaça de Catalunya',
  label: 'Plaça de Catalunya, Barcelona',
  coordinate: { latitude: 41.387, longitude: 2.17 },
  type: 'point-of-interest',
  precision: 'point',
};

function createProvider(): {
  provider: GeocodingProvider;
  mocks: {
    autocompleteLocations: GeocodingProvider['autocompleteLocations'];
    searchLocations: GeocodingProvider['searchLocations'];
    getLocationDetails: GeocodingProvider['getLocationDetails'];
    reverseGeocode: GeocodingProvider['reverseGeocode'];
  };
} {
  const mocks = {
    autocompleteLocations: vi.fn(async () => ({
      items: [
        {
          id: location.id,
          primaryText: location.name,
          type: location.type,
          precision: location.precision,
        },
      ],
      attribution,
    })),
    searchLocations: vi.fn(async () => ({ items: [location], attribution })),
    getLocationDetails: vi.fn(async () => ({ location, attribution })),
    reverseGeocode: vi.fn(async () => ({ items: [location], attribution })),
  };

  return {
    provider: mocks,
    mocks,
  };
}

describe('location application services', () => {
  it('applies defaults, clamps limits, normalizes countries, and calls autocomplete once', async () => {
    const { provider, mocks } = createProvider();
    const service = new AutocompleteLocationsService(provider, {
      defaultLimit: 5,
      maxLimit: 10,
    });

    await expect(
      service.autocomplete({
        query: 'Plaça',
        limit: 12,
        language: 'ca',
        countryCode: 'es',
        focus: { latitude: 41.387, longitude: 2.17 },
      }),
    ).resolves.toMatchObject({
      items: expect.any(Array),
      attribution,
    });
    expect(mocks.autocompleteLocations).toHaveBeenCalledOnce();
    expect(mocks.autocompleteLocations).toHaveBeenCalledWith({
      query: 'Plaça',
      limit: 10,
      language: 'ca',
      countryCode: 'ES',
      focus: { latitude: 41.387, longitude: 2.17 },
    });
  });

  it('applies default limits and preserves provider ordering for search', async () => {
    const { provider, mocks } = createProvider();
    const service = new SearchLocationsService(provider, {
      defaultLimit: 5,
      maxLimit: 10,
    });

    await expect(service.search({ query: 'Barcelona' })).resolves.toEqual({
      items: [location],
      attribution,
    });
    expect(mocks.searchLocations).toHaveBeenCalledWith({
      query: 'Barcelona',
      limit: 5,
    });
  });

  it('normalizes the country and caps an explicit search limit', async () => {
    const { provider, mocks } = createProvider();
    const service = new SearchLocationsService(provider, {
      defaultLimit: 5,
      maxLimit: 10,
    });

    await service.search({ query: 'Barcelona', countryCode: 'es', limit: 20 });

    expect(mocks.searchLocations).toHaveBeenCalledWith({
      query: 'Barcelona',
      countryCode: 'ES',
      limit: 10,
    });
  });

  it('calls details and reverse providers once', async () => {
    const { provider, mocks } = createProvider();
    const details = new GetLocationDetailsService(provider);
    const reverse = new ReverseGeocodeService(provider, {
      defaultLimit: 5,
      maxLimit: 10,
    });

    await details.getDetails({
      placeId: 'mock:placa-catalunya',
      language: 'ca',
    });
    await reverse.reverse({
      coordinate: { latitude: 41.387, longitude: 2.17 },
      countryCode: 'es',
    });

    expect(mocks.getLocationDetails).toHaveBeenCalledOnce();
    expect(mocks.reverseGeocode).toHaveBeenCalledWith({
      coordinate: { latitude: 41.387, longitude: 2.17 },
      limit: 5,
      countryCode: 'ES',
    });
  });

  it('uses the default reverse limit when no country is supplied', async () => {
    const { provider, mocks } = createProvider();
    const service = new ReverseGeocodeService(provider, {
      defaultLimit: 5,
      maxLimit: 10,
    });
    const coordinate = { latitude: 41.387, longitude: 2.17 };

    await service.reverse({ coordinate });

    expect(mocks.reverseGeocode).toHaveBeenCalledWith({
      coordinate,
      limit: 5,
    });
  });
});
