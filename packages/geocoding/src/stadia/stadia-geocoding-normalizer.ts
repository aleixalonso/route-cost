import { GeocodingProviderInvalidResponseError } from '../geocoding-provider-errors.js';
import type * as Geocoding from '../index.js';
import {
  assertValidBoundingBox,
  assertValidCoordinate,
  mapProviderLayer,
  mapProviderPrecision,
} from '../location-normalization.js';
import { StadiaLocationNotFoundError } from './stadia-geocoding.errors.js';
import type {
  StadiaAutocompleteResponse,
  StadiaFullLocationResponse,
} from './stadia-geocoding-config.js';

export function normalizeAutocompleteResponse(
  response: StadiaAutocompleteResponse,
): Geocoding.AutocompleteLocationsResult {
  return {
    items: response.features.map((feature) => ({
      id: feature.properties.gid,
      primaryText: feature.properties.name,
      ...(feature.properties.coarse_location === undefined
        ? {}
        : { secondaryText: feature.properties.coarse_location }),
      type: mapProviderLayer(feature.properties.layer),
      precision: mapProviderPrecision(feature.properties.precision),
    })),
    attribution: normalizeAttribution(response),
  };
}

export function normalizeSearchResponse(
  response: StadiaFullLocationResponse,
): Geocoding.SearchLocationsResult {
  return {
    items: response.features.map(normalizeLocationFeature),
    attribution: normalizeAttribution(response),
  };
}

export function normalizePlaceDetailsResponse(
  response: StadiaFullLocationResponse,
  requestedPlaceId: string,
): Geocoding.LocationDetailsResult {
  const locations = response.features
    .filter((feature) => feature.properties.gid === requestedPlaceId)
    .map(normalizeLocationFeature);

  if (locations.length !== 1 || locations[0] === undefined) {
    throw new StadiaLocationNotFoundError({
      providerErrorCode: 'location_not_found',
    });
  }

  return {
    location: locations[0],
    attribution: normalizeAttribution(response),
  };
}

export function normalizeReverseResponse(
  response: StadiaFullLocationResponse,
): Geocoding.ReverseGeocodeResult {
  return {
    items: response.features.map(normalizeLocationFeature),
    attribution: normalizeAttribution(response),
  };
}

function normalizeLocationFeature(
  feature: StadiaFullLocationResponse['features'][number],
): Geocoding.GeocodedLocation {
  if (feature.geometry.type !== 'Point') {
    throw invalidResponse('invalid_geometry');
  }

  const [longitude, latitude] = feature.geometry.coordinates;
  const coordinate = { latitude, longitude };
  assertValidCoordinate(coordinate);
  const boundingBox = normalizeBoundingBox(feature.bbox);
  const properties = feature.properties;
  const label =
    properties.formatted_address_line ??
    properties.label ??
    (properties.coarse_location === undefined
      ? properties.name
      : `${properties.name}, ${properties.coarse_location}`);
  const context = properties.context?.whosonfirst;
  const countryCode =
    properties.country_code ?? properties.context?.iso_3166_a2;
  const country = properties.country ?? context?.country?.name;
  const region =
    properties.region ?? context?.macroregion?.name ?? context?.region?.name;
  const county =
    properties.county ?? context?.macrocounty?.name ?? context?.county?.name;
  const locality = properties.locality ?? context?.locality?.name;
  const neighbourhood =
    properties.neighbourhood ?? context?.neighbourhood?.name;
  const postalCode =
    properties.postalcode ??
    properties.address_components?.postalcode ??
    properties.address_components?.postcode;

  return {
    id: properties.gid,
    name: properties.name,
    label,
    ...(properties.formatted_address_line === undefined
      ? {}
      : { formattedAddress: properties.formatted_address_line }),
    coordinate,
    ...(boundingBox === undefined ? {} : { boundingBox }),
    type: mapProviderLayer(properties.layer),
    precision: mapProviderPrecision(properties.precision),
    ...(countryCode === undefined ? {} : { countryCode }),
    ...(country === undefined ? {} : { country }),
    ...(region === undefined ? {} : { region }),
    ...(county === undefined ? {} : { county }),
    ...(locality === undefined ? {} : { locality }),
    ...(neighbourhood === undefined ? {} : { neighbourhood }),
    ...(postalCode === undefined ? {} : { postalCode }),
  };
}

function normalizeBoundingBox(
  bbox: readonly [number, number, number, number] | undefined,
): Geocoding.BoundingBox | undefined {
  if (bbox === undefined) {
    return undefined;
  }

  const [west, south, east, north] = bbox;
  const boundingBox = { west, south, east, north };
  assertValidBoundingBox(boundingBox);
  return boundingBox;
}

function normalizeAttribution(
  response: StadiaAutocompleteResponse | StadiaFullLocationResponse,
): Geocoding.LocationAttribution {
  return {
    url:
      typeof response.geocoding.attribution === 'string'
        ? response.geocoding.attribution
        : response.geocoding.attribution.url,
  };
}

function invalidResponse(providerErrorCode: string): Error {
  return new GeocodingProviderInvalidResponseError(
    'Invalid geocoding response.',
    { providerErrorCode },
  );
}
