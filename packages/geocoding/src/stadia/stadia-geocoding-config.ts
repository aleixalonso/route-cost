import type { z } from 'zod';

import type {
  stadiaAutocompleteResponseSchema,
  stadiaErrorResponseSchema,
  stadiaFullLocationResponseSchema,
} from './stadia-geocoding.schema.js';

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
