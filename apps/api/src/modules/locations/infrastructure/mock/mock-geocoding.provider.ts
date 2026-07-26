import { Injectable } from '@nestjs/common';
import {
  type AutocompleteLocationsRequest,
  type AutocompleteLocationsResult,
  type GeocodedLocation,
  type GeocodingProvider,
  type GetLocationDetailsRequest,
  type LocationAttribution,
  type LocationDetailsResult,
  LocationNotFoundError,
  type ReverseGeocodeRequest,
  type ReverseGeocodeResult,
  type SearchLocationsRequest,
  type SearchLocationsResult,
} from '@route-cost/geocoding';

const attribution: LocationAttribution = {
  url: 'https://stadiamaps.com/attribution/',
};

const locations: readonly GeocodedLocation[] = [
  {
    id: 'mock:placa-catalunya',
    name: 'Plaça de Catalunya',
    label: 'Plaça de Catalunya, Barcelona, Catalunya, España',
    formattedAddress: 'Plaça de Catalunya, Barcelona, Catalunya, España',
    coordinate: { latitude: 41.387, longitude: 2.17 },
    type: 'point-of-interest',
    precision: 'point',
    countryCode: 'ES',
    country: 'España',
    region: 'Catalunya',
    locality: 'Barcelona',
    postalCode: '08002',
  },
  {
    id: 'mock:sagrada-familia',
    name: 'Sagrada Família',
    label: 'Sagrada Família, Barcelona, Catalunya, España',
    formattedAddress: 'Carrer de Mallorca, 401, Barcelona, Catalunya, España',
    coordinate: { latitude: 41.4036, longitude: 2.1744 },
    type: 'point-of-interest',
    precision: 'point',
    countryCode: 'ES',
    country: 'España',
    region: 'Catalunya',
    locality: 'Barcelona',
    postalCode: '08013',
  },
  {
    id: 'mock:avinguda-diagonal',
    name: 'Avinguda Diagonal',
    label: 'Avinguda Diagonal, Barcelona, Catalunya, España',
    coordinate: { latitude: 41.3917, longitude: 2.1649 },
    type: 'street',
    precision: 'centroid',
    countryCode: 'ES',
    country: 'España',
    region: 'Catalunya',
    locality: 'Barcelona',
  },
  {
    id: 'mock:barcelona',
    name: 'Barcelona',
    label: 'Barcelona, Catalunya, España',
    coordinate: { latitude: 41.3888, longitude: 2.159 },
    boundingBox: { west: 2.0525, south: 41.317, east: 2.228, north: 41.468 },
    type: 'locality',
    precision: 'centroid',
    countryCode: 'ES',
    country: 'España',
    region: 'Catalunya',
    locality: 'Barcelona',
  },
];

@Injectable()
export class MockGeocodingProvider implements GeocodingProvider {
  public autocompleteLocations(
    request: AutocompleteLocationsRequest,
  ): Promise<AutocompleteLocationsResult> {
    return Promise.resolve({
      items: findLocations(request.query, request.limit).map((location) => {
        const secondaryText = location.locality ?? location.region;

        return {
          id: location.id,
          primaryText: location.name,
          ...(secondaryText === undefined ? {} : { secondaryText }),
          type: location.type,
          precision: location.precision,
        };
      }),
      attribution,
    });
  }

  public searchLocations(
    request: SearchLocationsRequest,
  ): Promise<SearchLocationsResult> {
    return Promise.resolve({
      items: findLocations(request.query, request.limit),
      attribution,
    });
  }

  public getLocationDetails(
    request: GetLocationDetailsRequest,
  ): Promise<LocationDetailsResult> {
    const location = locations.find((item) => item.id === request.placeId);

    if (location === undefined) {
      throw new LocationNotFoundError('Mock location was not found.');
    }

    return Promise.resolve({ location, attribution });
  }

  public reverseGeocode(
    request: ReverseGeocodeRequest,
  ): Promise<ReverseGeocodeResult> {
    if (
      Math.abs(request.coordinate.latitude - 41.387) > 0.2 ||
      Math.abs(request.coordinate.longitude - 2.17) > 0.2
    ) {
      return Promise.resolve({ items: [], attribution });
    }

    return Promise.resolve({
      items: locations.slice(0, request.limit),
      attribution,
    });
  }
}

function findLocations(
  query: string,
  limit: number,
): readonly GeocodedLocation[] {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.includes('empty')) {
    return [];
  }

  return locations
    .filter((location) =>
      normalizeSearchText(location.label).includes(normalizedQuery),
    )
    .slice(0, limit);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
