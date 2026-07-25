import type { z } from 'zod';

import type { Environment } from '../../../../config/environment';
import type { valhallaRouteResponseSchema } from './valhalla-route.schema';
import type { valhallaTraceAttributesResponseSchema } from './valhalla-trace-attributes.schema';

export const VALHALLA_CONFIG = Symbol('VALHALLA_CONFIG');

export interface ValhallaConfig {
  baseUrl: string;
  routePath: string;
  traceAttributesPath: string;
  apiKey: string;
  clientId: string;
  requestTimeoutMs: number;
  maxAlternatives: number;
}

export type ValhallaRouteResponse = z.infer<typeof valhallaRouteResponseSchema>;

export type ValhallaTraceAttributesResponse = z.infer<
  typeof valhallaTraceAttributesResponseSchema
>;

export interface ValhallaRouteRequest {
  locations: readonly [
    { lat: number; lon: number },
    { lat: number; lon: number },
  ];
  costing: string;
  units: 'kilometers';
  directions_type: 'none';
  alternates?: number;
  costing_options?: Record<string, Record<string, number | boolean | string>>;
}

export interface ValhallaTraceAttributesRequest {
  encoded_polyline: string;
  costing: string;
  shape_match: 'edge_walk';
  filters: {
    action: 'include';
    attributes: readonly string[];
  };
  costing_options?: Record<string, Record<string, number | boolean | string>>;
}

export function toValhallaConfig(environment: Environment): ValhallaConfig {
  return {
    baseUrl: environment.VALHALLA_BASE_URL,
    routePath: environment.VALHALLA_ROUTE_PATH,
    traceAttributesPath: environment.VALHALLA_TRACE_ATTRIBUTES_PATH,
    apiKey: environment.VALHALLA_API_KEY,
    clientId: environment.VALHALLA_CLIENT_ID,
    requestTimeoutMs: environment.VALHALLA_REQUEST_TIMEOUT_MS,
    maxAlternatives: environment.VALHALLA_MAX_ALTERNATIVES,
  };
}
