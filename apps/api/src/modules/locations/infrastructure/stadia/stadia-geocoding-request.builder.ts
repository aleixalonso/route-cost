import type {
  AutocompleteLocationsRequest,
  GetLocationDetailsRequest,
  ReverseGeocodeRequest,
  SearchLocationsRequest,
} from '@route-cost/geocoding';

import { StadiaGeocodingInvalidResponseError } from './stadia-geocoding.errors';
import type { StadiaGeocodingConfig } from './stadia-geocoding.types';

const AUTOCOMPLETE_LAYERS = [
  'address',
  'street',
  'poi',
  'locality',
  'region',
  'country',
] as const;
const REVERSE_LAYERS = ['address', 'street', 'poi', 'locality'] as const;

export function buildAutocompleteUrl(
  request: AutocompleteLocationsRequest,
  config: StadiaGeocodingConfig,
): URL {
  const url = buildBaseUrl(config.autocompletePath, config);
  appendTextRequestParams(url, request, config);
  url.searchParams.set('layers', AUTOCOMPLETE_LAYERS.join(','));
  return url;
}

export function buildSearchUrl(
  request: SearchLocationsRequest,
  config: StadiaGeocodingConfig,
): URL {
  const url = buildBaseUrl(config.searchPath, config);
  appendTextRequestParams(url, request, config);
  return url;
}

export function buildPlaceDetailsUrl(
  request: GetLocationDetailsRequest,
  config: StadiaGeocodingConfig,
): URL {
  if (containsControlCharacter(request.placeId)) {
    throw new StadiaGeocodingInvalidResponseError({
      providerErrorCode: 'invalid_place_id',
    });
  }

  const url = buildBaseUrl(config.placeDetailsPath, config);
  url.searchParams.set('ids', request.placeId);
  appendOptional(url, 'lang', request.language);
  appendClientId(url, config);
  return url;
}

export function buildReverseUrl(
  request: ReverseGeocodeRequest,
  config: StadiaGeocodingConfig,
): URL {
  const url = buildBaseUrl(config.reversePath, config);
  url.searchParams.set('point.lat', String(request.coordinate.latitude));
  url.searchParams.set('point.lon', String(request.coordinate.longitude));
  url.searchParams.set('size', String(clampLimit(request.limit, config)));
  url.searchParams.set('layers', REVERSE_LAYERS.join(','));
  appendOptional(url, 'lang', request.language);
  appendOptional(url, 'boundary.country', request.countryCode?.toUpperCase());
  appendClientId(url, config);
  return url;
}

function appendTextRequestParams(
  url: URL,
  request: AutocompleteLocationsRequest | SearchLocationsRequest,
  config: StadiaGeocodingConfig,
): void {
  url.searchParams.set('text', request.query);
  url.searchParams.set('size', String(clampLimit(request.limit, config)));
  appendOptional(url, 'lang', request.language);
  appendOptional(url, 'boundary.country', request.countryCode?.toUpperCase());

  if (request.focus !== undefined) {
    url.searchParams.set('focus.point.lat', String(request.focus.latitude));
    url.searchParams.set('focus.point.lon', String(request.focus.longitude));
  }

  appendClientId(url, config);
}

function buildBaseUrl(path: string, config: StadiaGeocodingConfig): URL {
  const url = new URL(path, config.baseUrl);

  if (url.origin !== new URL(config.baseUrl).origin) {
    throw new StadiaGeocodingInvalidResponseError({
      providerErrorCode: 'invalid_provider_url',
    });
  }

  return url;
}

function appendOptional(
  url: URL,
  key: string,
  value: string | undefined,
): void {
  if (value !== undefined) {
    url.searchParams.set(key, value);
  }
}

function appendClientId(url: URL, config: StadiaGeocodingConfig): void {
  url.searchParams.set('client_id', config.clientId);
}

function clampLimit(limit: number, config: StadiaGeocodingConfig): number {
  return Math.min(limit, config.maxLimit);
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}
