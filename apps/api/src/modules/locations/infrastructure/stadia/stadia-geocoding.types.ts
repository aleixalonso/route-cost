import type { z } from 'zod';

import type { Environment } from '../../../../config/environment';
import type {
  stadiaAutocompleteResponseSchema,
  stadiaErrorResponseSchema,
  stadiaFullLocationResponseSchema,
} from './stadia-geocoding.schema';

export const STADIA_GEOCODING_CONFIG = Symbol('STADIA_GEOCODING_CONFIG');

export interface StadiaGeocodingConfig {
  baseUrl: string;
  autocompletePath: string;
  searchPath: string;
  placeDetailsPath: string;
  reversePath: string;
  apiKey: string;
  clientId: string;
  requestTimeoutMs: number;
  defaultLimit: number;
  maxLimit: number;
}

export type StadiaAutocompleteResponse = z.infer<
  typeof stadiaAutocompleteResponseSchema
>;
export type StadiaFullLocationResponse = z.infer<
  typeof stadiaFullLocationResponseSchema
>;
export type StadiaErrorResponse = z.infer<typeof stadiaErrorResponseSchema>;

export function toStadiaGeocodingConfig(
  environment: Environment,
): StadiaGeocodingConfig {
  return {
    baseUrl: environment.STADIA_GEOCODING_BASE_URL,
    autocompletePath: environment.STADIA_GEOCODING_AUTOCOMPLETE_PATH,
    searchPath: environment.STADIA_GEOCODING_SEARCH_PATH,
    placeDetailsPath: environment.STADIA_GEOCODING_PLACE_DETAILS_PATH,
    reversePath: environment.STADIA_GEOCODING_REVERSE_PATH,
    apiKey: environment.STADIA_GEOCODING_API_KEY,
    clientId: environment.STADIA_GEOCODING_CLIENT_ID,
    requestTimeoutMs: environment.STADIA_GEOCODING_REQUEST_TIMEOUT_MS,
    defaultLimit: environment.STADIA_GEOCODING_DEFAULT_LIMIT,
    maxLimit: environment.STADIA_GEOCODING_MAX_LIMIT,
  };
}
