import { ConfigService } from '@nestjs/config';

import type { Environment } from './environment';

/**
 * Rebuilds the typed, validated {@link Environment} from the global
 * ConfigService exactly once per application. Modules inject {@link ENVIRONMENT}
 * instead of hand-plumbing individual keys through ConfigService.
 */
export function buildEnvironment(
  configService: ConfigService<Environment, true>,
): Environment {
  return {
    NODE_ENV: configService.get('NODE_ENV', { infer: true }),
    HOST: configService.get('HOST', { infer: true }),
    PORT: configService.get('PORT', { infer: true }),
    CORS_ORIGINS: configService.get('CORS_ORIGINS', { infer: true }),
    SWAGGER_ENABLED: configService.get('SWAGGER_ENABLED', { infer: true }),
    ROUTING_PROVIDER: configService.get('ROUTING_PROVIDER', { infer: true }),
    VALHALLA_BASE_URL: configService.get('VALHALLA_BASE_URL', { infer: true }),
    VALHALLA_ROUTE_PATH: configService.get('VALHALLA_ROUTE_PATH', {
      infer: true,
    }),
    VALHALLA_TRACE_ATTRIBUTES_PATH: configService.get(
      'VALHALLA_TRACE_ATTRIBUTES_PATH',
      { infer: true },
    ),
    VALHALLA_API_KEY: configService.get('VALHALLA_API_KEY', { infer: true }),
    VALHALLA_CLIENT_ID: configService.get('VALHALLA_CLIENT_ID', {
      infer: true,
    }),
    VALHALLA_REQUEST_TIMEOUT_MS: configService.get(
      'VALHALLA_REQUEST_TIMEOUT_MS',
      { infer: true },
    ),
    VALHALLA_MAX_ALTERNATIVES: configService.get('VALHALLA_MAX_ALTERNATIVES', {
      infer: true,
    }),
    GEOCODING_PROVIDER: configService.get('GEOCODING_PROVIDER', {
      infer: true,
    }),
    STADIA_GEOCODING_BASE_URL: configService.get('STADIA_GEOCODING_BASE_URL', {
      infer: true,
    }),
    STADIA_GEOCODING_AUTOCOMPLETE_PATH: configService.get(
      'STADIA_GEOCODING_AUTOCOMPLETE_PATH',
      { infer: true },
    ),
    STADIA_GEOCODING_SEARCH_PATH: configService.get(
      'STADIA_GEOCODING_SEARCH_PATH',
      { infer: true },
    ),
    STADIA_GEOCODING_PLACE_DETAILS_PATH: configService.get(
      'STADIA_GEOCODING_PLACE_DETAILS_PATH',
      { infer: true },
    ),
    STADIA_GEOCODING_REVERSE_PATH: configService.get(
      'STADIA_GEOCODING_REVERSE_PATH',
      { infer: true },
    ),
    STADIA_GEOCODING_API_KEY: configService.get('STADIA_GEOCODING_API_KEY', {
      infer: true,
    }),
    STADIA_GEOCODING_CLIENT_ID: configService.get(
      'STADIA_GEOCODING_CLIENT_ID',
      { infer: true },
    ),
    STADIA_GEOCODING_REQUEST_TIMEOUT_MS: configService.get(
      'STADIA_GEOCODING_REQUEST_TIMEOUT_MS',
      { infer: true },
    ),
    STADIA_GEOCODING_DEFAULT_LIMIT: configService.get(
      'STADIA_GEOCODING_DEFAULT_LIMIT',
      { infer: true },
    ),
    STADIA_GEOCODING_MAX_LIMIT: configService.get(
      'STADIA_GEOCODING_MAX_LIMIT',
      { infer: true },
    ),
    FUEL_PRICE_PROVIDER_MODE: configService.get('FUEL_PRICE_PROVIDER_MODE', {
      infer: true,
    }),
    SPAIN_FUEL_PRICE_SOURCE_URL: configService.get(
      'SPAIN_FUEL_PRICE_SOURCE_URL',
      { infer: true },
    ),
    SPAIN_FUEL_PRICES_REQUEST_TIMEOUT_MS: configService.get(
      'SPAIN_FUEL_PRICES_REQUEST_TIMEOUT_MS',
      { infer: true },
    ),
    SPAIN_FUEL_PRICES_CACHE_TTL_MS: configService.get(
      'SPAIN_FUEL_PRICES_CACHE_TTL_MS',
      { infer: true },
    ),
    SPAIN_FUEL_PRICES_STALE_IF_ERROR_MS: configService.get(
      'SPAIN_FUEL_PRICES_STALE_IF_ERROR_MS',
      { infer: true },
    ),
    FUEL_PRICE_RADIUS_STEPS_METRES: configService.get(
      'FUEL_PRICE_RADIUS_STEPS_METRES',
      { infer: true },
    ),
    FUEL_PRICE_MIN_STATION_COUNT: configService.get(
      'FUEL_PRICE_MIN_STATION_COUNT',
      { infer: true },
    ),
    FUEL_PRICE_MAX_STATION_COUNT: configService.get(
      'FUEL_PRICE_MAX_STATION_COUNT',
      { infer: true },
    ),
    FUEL_PRICE_MAX_DATA_AGE_HOURS: configService.get(
      'FUEL_PRICE_MAX_DATA_AGE_HOURS',
      { infer: true },
    ),
  };
}
