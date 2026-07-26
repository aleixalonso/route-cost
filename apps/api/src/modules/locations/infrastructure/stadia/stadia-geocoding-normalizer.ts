import {
  assertValidBoundingBox,
  assertValidCoordinate,
  type AutocompleteLocationsResult,
  type BoundingBox,
  type GeocodedLocation,
  GeocodingProviderInvalidResponseError,
  type LocationAttribution,
  type LocationDetailsResult,
  mapProviderLayer,
  mapProviderPrecision,
  type ReverseGeocodeResult,
  type SearchLocationsResult,
} from '@route-cost/geocoding';

import { StadiaLocationNotFoundError } from './stadia-geocoding.errors';
import type {
  StadiaAutocompleteResponse,
  StadiaFullLocationResponse,
} from './stadia-geocoding.types';

export function normalizeAutocompleteResponse(
  response: StadiaAutocompleteResponse,
): AutocompleteLocationsResult {
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
): SearchLocationsResult {
  return {
    items: response.features.map(normalizeLocationFeature),
    attribution: normalizeAttribution(response),
  };
}

export function normalizePlaceDetailsResponse(
  response: StadiaFullLocationResponse,
  requestedPlaceId: string,
): LocationDetailsResult {
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
): ReverseGeocodeResult {
  return {
    items: response.features.map(normalizeLocationFeature),
    attribution: normalizeAttribution(response),
  };
}

function normalizeLocationFeature(
  feature: StadiaFullLocationResponse['features'][number],
): GeocodedLocation {
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
): BoundingBox | undefined {
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
): LocationAttribution {
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
