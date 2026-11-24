import { describe, expect, it } from 'vitest';

import autocompleteFixture from '../../test/fixtures/stadia-geocoding/autocomplete-results.json' with { type: 'json' };
import placeDetailsFixture from '../../test/fixtures/stadia-geocoding/place-details-result.json' with { type: 'json' };
import searchFixture from '../../test/fixtures/stadia-geocoding/search-results.json' with { type: 'json' };
import { StadiaLocationNotFoundError } from './stadia-geocoding.errors.js';
import {
  stadiaAutocompleteResponseSchema,
  stadiaFullLocationResponseSchema,
} from './stadia-geocoding.schema.js';
import {
  normalizeAutocompleteResponse,
  normalizePlaceDetailsResponse,
  normalizeReverseResponse,
  normalizeSearchResponse,
} from './stadia-geocoding-normalizer.js';

describe('Stadia geocoding normalizer', () => {
  it('normalizes autocomplete suggestions without coordinates', () => {
    const response = normalizeAutocompleteResponse(
      stadiaAutocompleteResponseSchema.parse(autocompleteFixture),
    );

    expect(response.attribution.url).toBe(
      'https://stadiamaps.com/attribution/',
    );
    expect(response.items[0]).toEqual({
      id: 'stadia:poi:placa-catalunya',
      primaryText: 'Plaça de Catalunya',
      secondaryText: 'Barcelona, Catalunya, España',
      type: 'point-of-interest',
      precision: 'point',
    });
    expect(response.items[0]).not.toHaveProperty('coordinate');
    expect(response.items[1]?.type).toBe('other');
  });

  it('normalizes full search results in provider order and GeoJSON coordinate order', () => {
    const response = normalizeSearchResponse(
      stadiaFullLocationResponseSchema.parse(searchFixture),
    );

    expect(response.items.map((item) => item.id)).toEqual([
      'stadia:poi:placa-catalunya',
      'stadia:locality:barcelona',
    ]);
    expect(response.items[0]).toMatchObject({
      coordinate: { latitude: 41.387, longitude: 2.17 },
      postalCode: '08002',
      boundingBox: { west: 2.169, south: 41.386, east: 2.171, north: 41.388 },
    });
    expect(response.items[1]).not.toHaveProperty('formattedAddress');
    expect(response.items[0]).not.toHaveProperty('properties');
    expect(response.items[0]).not.toHaveProperty('geometry');
  });

  it('normalizes place details and reverse responses', () => {
    const parsed = stadiaFullLocationResponseSchema.parse(placeDetailsFixture);

    expect(
      normalizePlaceDetailsResponse(parsed, 'stadia:poi:sagrada-familia')
        .location.coordinate,
    ).toEqual({ latitude: 41.4036, longitude: 2.1744 });
    expect(normalizeReverseResponse(parsed).items).toHaveLength(1);
  });

  it('throws when place details has no matching feature', () => {
    expect(() =>
      normalizePlaceDetailsResponse(
        stadiaFullLocationResponseSchema.parse(placeDetailsFixture),
        'missing',
      ),
    ).toThrow(StadiaLocationNotFoundError);
  });

  it('rejects invalid coordinates and malformed bounding boxes', () => {
    const parsed = stadiaFullLocationResponseSchema.parse(searchFixture);

    expect(() =>
      normalizeSearchResponse({
        ...parsed,
        features: [
          {
            ...parsed.features[0]!,
            geometry: { type: 'Point', coordinates: [181, 41] },
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      normalizeSearchResponse({
        ...parsed,
        features: [{ ...parsed.features[0]!, bbox: [3, 1, 2, 4] }],
      }),
    ).toThrow();
  });
});
