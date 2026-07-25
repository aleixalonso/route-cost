import type { RoutingProfile } from '@route-cost/routing';
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

export type ValhallaTraceAttribute =
  | 'edge.length'
  | 'edge.speed'
  | 'edge.speed_limit'
  | 'edge.road_class'
  | 'edge.use'
  | 'edge.toll'
  | 'edge.unpaved'
  | 'edge.surface'
  | 'edge.density'
  | 'edge.weighted_grade'
  | 'edge.max_upward_grade'
  | 'edge.max_downward_grade'
  | 'edge.mean_elevation'
  | 'edge.begin_shape_index'
  | 'edge.end_shape_index';

export interface ValhallaCostingOptions {
  motorcycle?: {
    use_unpaved: number;
  };
  motor_scooter?: {
    top_speed: number;
    use_highways: number;
  };
}

export interface ValhallaRouteRequest {
  locations: readonly [
    { lat: number; lon: number },
    { lat: number; lon: number },
  ];
  costing: RoutingProfile;
  units: 'kilometers';
  directions_type: 'none';
  alternates?: number;
  costing_options?: ValhallaCostingOptions;
}

export interface ValhallaTraceAttributesRequest {
  encoded_polyline: string;
  costing: RoutingProfile;
  shape_match: 'edge_walk';
  filters: {
    action: 'include';
    attributes: readonly ValhallaTraceAttribute[];
  };
  costing_options?: ValhallaCostingOptions;
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
