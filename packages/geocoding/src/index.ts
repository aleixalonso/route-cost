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

interface ProviderErrorOptions {
  status?: number | undefined;
  providerRequestId?: string | undefined;
  providerErrorCode?: string | undefined;
}

class GeocodingProviderError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(message: string, options: ProviderErrorOptions = {}) {
    super(message);
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class GeocodingProviderAuthenticationError extends GeocodingProviderError {
  public constructor(
    message = 'Geocoding provider authentication failed.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'GeocodingProviderAuthenticationError';
  }
}

export class GeocodingProviderRateLimitError extends GeocodingProviderError {
  public constructor(
    message = 'Geocoding provider rate limit exceeded.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'GeocodingProviderRateLimitError';
  }
}

export class GeocodingProviderTimeoutError extends Error {
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Geocoding provider request timed out.',
    options: Pick<
      ProviderErrorOptions,
      'providerRequestId' | 'providerErrorCode'
    > = {},
  ) {
    super(message);
    this.name = 'GeocodingProviderTimeoutError';
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class GeocodingProviderUnavailableError extends GeocodingProviderError {
  public constructor(
    message = 'Geocoding provider is unavailable.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'GeocodingProviderUnavailableError';
  }
}

export class GeocodingProviderInvalidResponseError extends GeocodingProviderError {
  public constructor(
    message = 'Geocoding provider returned an invalid response.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'GeocodingProviderInvalidResponseError';
  }
}

export class LocationNotFoundError extends GeocodingProviderError {
  public constructor(
    message = 'Location was not found.',
    options: ProviderErrorOptions = {},
  ) {
    super(message, options);
    this.name = 'LocationNotFoundError';
  }
}

export function mapProviderLayer(layer: string): LocationType {
  switch (layer) {
    case 'address':
      return 'address';
    case 'street':
      return 'street';
    case 'poi':
      return 'point-of-interest';
    case 'postalcode':
      return 'postal-code';
    case 'neighbourhood':
      return 'neighbourhood';
    case 'locality':
    case 'localadmin':
    case 'borough':
      return 'locality';
    case 'county':
    case 'macrocounty':
      return 'county';
    case 'region':
    case 'macroregion':
      return 'region';
    case 'country':
      return 'country';
    default:
      return 'other';
  }
}

export function mapProviderPrecision(
  precision: string | null | undefined,
): LocationPrecision {
  if (precision === 'point') {
    return 'point';
  }

  if (precision === 'centroid') {
    return 'centroid';
  }

  return 'unknown';
}

export function assertValidCoordinate(coordinate: Coordinate): void {
  if (
    !Number.isFinite(coordinate.latitude) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90 ||
    !Number.isFinite(coordinate.longitude) ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new GeocodingProviderInvalidResponseError(
      'Invalid geocoding coordinate.',
      { providerErrorCode: 'invalid_coordinate' },
    );
  }
}

export function assertValidBoundingBox(boundingBox: BoundingBox): void {
  if (
    !Number.isFinite(boundingBox.west) ||
    !Number.isFinite(boundingBox.south) ||
    !Number.isFinite(boundingBox.east) ||
    !Number.isFinite(boundingBox.north) ||
    boundingBox.west < -180 ||
    boundingBox.east > 180 ||
    boundingBox.south < -90 ||
    boundingBox.north > 90 ||
    boundingBox.west > boundingBox.east ||
    boundingBox.south > boundingBox.north
  ) {
    throw new GeocodingProviderInvalidResponseError(
      'Invalid geocoding bounding box.',
      { providerErrorCode: 'invalid_bounding_box' },
    );
  }
}
