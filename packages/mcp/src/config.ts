import { z } from 'zod';

export const configSchema = z.object({
  ROUTING_PROVIDER: z.enum(['mock', 'valhalla']).default('mock'),
  VALHALLA_API_KEY: z.string().default(''),
  VALHALLA_BASE_URL: z.url().default('https://api-eu.stadiamaps.com'),
  VALHALLA_ROUTE_PATH: z.string().default('/route/v1'),
  VALHALLA_TRACE_ATTRIBUTES_PATH: z.string().default('/trace_attributes/v1'),
  GEOCODING_PROVIDER: z.enum(['mock', 'stadia']).default('mock'),
  STADIA_API_KEY: z.string().default(''),
  STADIA_GEOCODING_API_KEY: z.string().default(''),
  STADIA_GEOCODING_BASE_URL: z.url().default('https://api-eu.stadiamaps.com'),
  STADIA_GEOCODING_SEARCH_PATH: z.string().default('/geocoding/v2/search'),
  STADIA_GEOCODING_AUTOCOMPLETE_PATH: z
    .string()
    .default('/geocoding/v2/autocomplete'),
  STADIA_GEOCODING_PLACE_DETAILS_PATH: z
    .string()
    .default('/geocoding/v2/place_details'),
  STADIA_GEOCODING_REVERSE_PATH: z.string().default('/geocoding/v2/reverse'),
  FUEL_PRICE_PROVIDER_MODE: z.enum(['live', 'mock']).default('live'),
  SPAIN_FUEL_PRICE_SOURCE_URL: z
    .url()
    .default(
      'https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/',
    ),
});

export type McpConfig = z.infer<typeof configSchema>;

export function parseConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const config = configSchema.parse(env);
  const stadiaKey =
    config.STADIA_GEOCODING_API_KEY.trim() || config.STADIA_API_KEY.trim();
  return {
    ...config,
    STADIA_GEOCODING_API_KEY: stadiaKey,
    STADIA_API_KEY: stadiaKey,
  };
}
