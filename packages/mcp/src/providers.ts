import { createSpainFuelPriceProvider } from '@route-cost/fuel-prices';
import { createStadiaGeocodingProvider } from '@route-cost/geocoding';
import { createValhallaRoutingProvider } from '@route-cost/routing';

import type { McpConfig } from './config.js';

export function createRoutingProvider(
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  return createValhallaRoutingProvider({
    baseUrl: config.VALHALLA_BASE_URL,
    routePath: config.VALHALLA_ROUTE_PATH,
    traceAttributesPath: config.VALHALLA_TRACE_ATTRIBUTES_PATH,
    apiKey: config.VALHALLA_API_KEY,
    clientId: 'route-cost',
    requestTimeoutMs: 8_000,
    maxAlternatives: 0,
    fetchImpl,
  });
}

export function createGeocodingProvider(
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  return createStadiaGeocodingProvider({
    baseUrl: config.STADIA_GEOCODING_BASE_URL,
    searchPath: config.STADIA_GEOCODING_SEARCH_PATH,
    autocompletePath: config.STADIA_GEOCODING_AUTOCOMPLETE_PATH,
    placeDetailsPath: config.STADIA_GEOCODING_PLACE_DETAILS_PATH,
    reversePath: config.STADIA_GEOCODING_REVERSE_PATH,
    apiKey: config.STADIA_GEOCODING_API_KEY,
    clientId: 'route-cost',
    requestTimeoutMs: 5_000,
    defaultLimit: 1,
    maxLimit: 10,
    fetchImpl,
  });
}

export function createFuelPriceProvider(
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  return createSpainFuelPriceProvider({
    sourceUrl: config.SPAIN_FUEL_PRICE_SOURCE_URL,
    requestTimeoutMs: 20_000,
    cacheTtlMs: 0,
    staleIfErrorMs: 0,
    fetchImpl,
  });
}
