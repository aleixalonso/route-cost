import {
  type AutocompleteLocationsResponse,
  autocompleteLocationsResponseSchema,
  type LocationDetailsResponse,
  locationDetailsResponseSchema,
} from '@route-cost/contracts';

import { apiRequest } from '../../../shared/api';

export interface FetchAutocompleteParameters {
  readonly query: string;
  readonly countryCode: 'ES';
  readonly language: string;
  readonly limit: number;
  readonly signal?: AbortSignal | undefined;
}

export function fetchLocationAutocomplete(
  parameters: FetchAutocompleteParameters,
): Promise<AutocompleteLocationsResponse> {
  const query = new URLSearchParams({
    query: parameters.query,
    countryCode: parameters.countryCode,
    language: parameters.language,
    limit: String(parameters.limit),
  });

  return apiRequest({
    path: '/locations/autocomplete',
    query,
    schema: autocompleteLocationsResponseSchema,
    signal: parameters.signal,
  });
}

export function fetchLocationDetails(parameters: {
  readonly placeId: string;
  readonly language: string;
  readonly signal?: AbortSignal | undefined;
}): Promise<LocationDetailsResponse> {
  const query = new URLSearchParams({
    placeId: parameters.placeId,
    language: parameters.language,
  });

  return apiRequest({
    path: '/locations/details',
    query,
    schema: locationDetailsResponseSchema,
    signal: parameters.signal,
  });
}
