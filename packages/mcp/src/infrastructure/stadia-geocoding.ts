import { z } from 'zod';

import type { McpConfig } from '../config.js';
import { UpstreamError } from '../errors.js';
import { fetchJson } from './http.js';

const responseSchema = z.object({
  features: z.array(
    z.object({
      properties: z.object({
        gid: z.string(),
        name: z.string(),
        label: z.string().optional(),
      }),
      geometry: z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([
          z.number().min(-180).max(180),
          z.number().min(-90).max(90),
        ]),
      }),
    }),
  ),
});

export async function geocode(
  query: string,
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  const url = new URL(
    config.STADIA_GEOCODING_SEARCH_PATH,
    config.STADIA_GEOCODING_BASE_URL,
  );
  url.searchParams.set('text', query);
  url.searchParams.set('size', '1');
  url.searchParams.set('lang', 'es');
  url.searchParams.set('client_id', 'route-cost');
  const data = await fetchJson(
    fetchImpl,
    'Stadia geocoding',
    url.toString(),
    {
      headers: {
        Authorization: `Stadia-Auth ${config.STADIA_API_KEY}`,
        'X-Client-Id': 'route-cost',
      },
    },
    5000,
    responseSchema,
  );
  const feature = data.features[0];
  if (feature === undefined)
    throw new UpstreamError(`Stadia geocoding could not resolve "${query}"`);
  return {
    label: feature.properties.label ?? feature.properties.name,
    latitude: feature.geometry.coordinates[1],
    longitude: feature.geometry.coordinates[0],
  };
}
