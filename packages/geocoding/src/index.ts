export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type LocationType =
  | 'address'
  | 'street'
  | 'point-of-interest'
  | 'postal-code'
  | 'neighbourhood'
  | 'locality'
  | 'county'
  | 'region'
  | 'country'
  | 'other';

export type LocationPrecision = 'point' | 'centroid' | 'unknown';

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface LocationAttribution {
  url: string;
}

export interface AutocompleteSuggestion {
  id: string;
  primaryText: string;
  secondaryText?: string;
  type: LocationType;
  precision: LocationPrecision;
}

export interface GeocodedLocation {
  id: string;
  name: string;
  label: string;
  formattedAddress?: string;
  coordinate: Coordinate;
  boundingBox?: BoundingBox;
  type: LocationType;
  precision: LocationPrecision;
  countryCode?: string;
  country?: string;
  region?: string;
  county?: string;
  locality?: string;
  neighbourhood?: string;
  postalCode?: string;
}

export interface LocationFocus {
  latitude: number;
  longitude: number;
}

export interface AutocompleteLocationsRequest {
  query: string;
  limit: number;
  language?: string;
  countryCode?: string;
  focus?: LocationFocus;
}

export interface SearchLocationsRequest {
  query: string;
  limit: number;
  language?: string;
  countryCode?: string;
  focus?: LocationFocus;
}

export interface GetLocationDetailsRequest {
  placeId: string;
  language?: string;
}

export interface ReverseGeocodeRequest {
  coordinate: Coordinate;
  limit: number;
  language?: string;
  countryCode?: string;
}

export interface AutocompleteLocationsResult {
  items: readonly AutocompleteSuggestion[];
  attribution: LocationAttribution;
}

export interface SearchLocationsResult {
  items: readonly GeocodedLocation[];
  attribution: LocationAttribution;
}

export interface LocationDetailsResult {
  location: GeocodedLocation;
  attribution: LocationAttribution;
}

export interface ReverseGeocodeResult {
  items: readonly GeocodedLocation[];
  attribution: LocationAttribution;
}

export interface GeocodingProvider {
  autocompleteLocations(
    request: AutocompleteLocationsRequest,
  ): Promise<AutocompleteLocationsResult>;
  searchLocations(
    request: SearchLocationsRequest,
  ): Promise<SearchLocationsResult>;
  getLocationDetails(
    request: GetLocationDetailsRequest,
  ): Promise<LocationDetailsResult>;
  reverseGeocode(request: ReverseGeocodeRequest): Promise<ReverseGeocodeResult>;
}

export * from './geocoding-provider-errors.js';
export * from './location-normalization.js';
export * from './stadia/stadia-geocoding.errors.js';
export * from './stadia/stadia-geocoding.schema.js';
export * from './stadia/stadia-geocoding-config.js';
export { StadiaGeocodingHttpClient } from './stadia/stadia-geocoding-http-client.js';
export * from './stadia/stadia-geocoding-normalizer.js';
export type { StadiaGeocodingProviderConfig } from './stadia/stadia-geocoding-provider.js';
export { createStadiaGeocodingProvider } from './stadia/stadia-geocoding-provider.js';
export * from './stadia/stadia-geocoding-request.builder.js';
