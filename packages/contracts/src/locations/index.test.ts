import { describe, expect, it } from 'vitest';

import {
  autocompleteLocationsQuerySchema,
  autocompleteLocationsResponseSchema,
  locationDetailsQuerySchema,
  locationDetailsResponseSchema,
  reverseGeocodeQuerySchema,
  reverseGeocodeResponseSchema,
  searchLocationsQuerySchema,
  searchLocationsResponseSchema,
} from './index.js';

const attribution = { url: 'https://example.com/attribution' };
const location = {
  id: 'mock:placa-catalunya',
  name: 'Plaça de Catalunya',
  label: 'Plaça de Catalunya, Barcelona, Catalunya, España',
  coordinate: { latitude: 41.387, longitude: 2.17 },
  type: 'point-of-interest',
  precision: 'point',
  countryCode: 'ES',
};

describe('location query contracts', () => {
  it('validates autocomplete query parameters', () => {
    expect(
      autocompleteLocationsQuerySchema.parse({
        query: 'Pla',
        limit: '5',
        language: 'ca',
        countryCode: 'es',
        focusLatitude: '41.387',
        focusLongitude: '2.170',
      }),
    ).toMatchObject({ query: 'Pla', limit: 5, countryCode: 'ES' });
    expect(() =>
      autocompleteLocationsQuerySchema.parse({ query: 'Pl' }),
    ).toThrow();
    expect(() =>
      autocompleteLocationsQuerySchema.parse({ query: '   ' }),
    ).toThrow();
    expect(() =>
      autocompleteLocationsQuerySchema.parse({ query: 'a'.repeat(201) }),
    ).toThrow();
    expect(() =>
      autocompleteLocationsQuerySchema.parse({ query: 'Pla', limit: 0 }),
    ).toThrow();
    expect(() =>
      autocompleteLocationsQuerySchema.parse({ query: 'Pla', limit: 11 }),
    ).toThrow();
    expect(() =>
      autocompleteLocationsQuerySchema.parse({ query: 'Pla', language: '!' }),
    ).toThrow();
    expect(
      autocompleteLocationsQuerySchema.parse({
        query: 'Pla',
        countryCode: 'esp',
      }).countryCode,
    ).toBe('ESP');
    expect(() =>
      autocompleteLocationsQuerySchema.parse({
        query: 'Pla',
        focusLatitude: 41.3,
      }),
    ).toThrow();
    expect(() =>
      autocompleteLocationsQuerySchema.parse({
        query: 'Pla',
        focusLatitude: 91,
        focusLongitude: 2,
      }),
    ).toThrow();
  });

  it('uses equivalent search query validation', () => {
    expect(searchLocationsQuerySchema.parse({ query: 'Barcelona' }).query).toBe(
      'Barcelona',
    );
    expect(() => searchLocationsQuerySchema.parse({ query: 'Ba' })).toThrow();
  });

  it('validates details query parameters', () => {
    expect(
      locationDetailsQuerySchema.parse({
        placeId: 'stadia:place/with:separators',
      }).placeId,
    ).toBe('stadia:place/with:separators');
    expect(() => locationDetailsQuerySchema.parse({ placeId: '' })).toThrow();
    expect(() =>
      locationDetailsQuerySchema.parse({ placeId: 'a'.repeat(501) }),
    ).toThrow();
    expect(() =>
      locationDetailsQuerySchema.parse({ placeId: 'bad\nid' }),
    ).toThrow();
  });

  it('validates reverse query parameters', () => {
    expect(
      reverseGeocodeQuerySchema.parse({
        latitude: '41.387',
        longitude: '2.170',
        limit: '3',
        language: 'es-ES',
        countryCode: 'fr',
      }),
    ).toMatchObject({ latitude: 41.387, longitude: 2.17, countryCode: 'FR' });
    expect(() =>
      reverseGeocodeQuerySchema.parse({ longitude: 2.17 }),
    ).toThrow();
    expect(() =>
      reverseGeocodeQuerySchema.parse({ latitude: 91, longitude: 2 }),
    ).toThrow();
  });
});

describe('location response contracts', () => {
  it('accepts autocomplete responses without coordinates', () => {
    expect(
      autocompleteLocationsResponseSchema.parse({
        items: [
          {
            id: 'mock:sagrada-familia',
            primaryText: 'Sagrada Família',
            secondaryText: 'Barcelona',
            type: 'point-of-interest',
            precision: 'point',
          },
        ],
        attribution,
      }),
    ).toBeDefined();
  });

  it('accepts full and empty list responses', () => {
    expect(
      searchLocationsResponseSchema.parse({ items: [location], attribution }),
    ).toBeDefined();
    expect(
      reverseGeocodeResponseSchema.parse({ items: [], attribution }),
    ).toBeDefined();
  });

  it('accepts details responses and rejects invalid shapes', () => {
    expect(
      locationDetailsResponseSchema.parse({ location, attribution }),
    ).toBeDefined();
    expect(() =>
      searchLocationsResponseSchema.parse({ items: [location] }),
    ).toThrow();
    expect(() =>
      searchLocationsResponseSchema.parse({
        items: [
          {
            ...location,
            coordinate: { latitude: 91, longitude: 2.17 },
          },
        ],
        attribution,
      }),
    ).toThrow();
    expect(() =>
      searchLocationsResponseSchema.parse({
        items: [{ ...location, type: 'venue' }],
        attribution,
      }),
    ).toThrow();
  });
});
