import type { z } from 'zod';

import type { RoutingProfile } from '../index.js';
import type { valhallaRouteResponseSchema } from './valhalla-route.schema.js';
import type { valhallaTraceAttributesResponseSchema } from './valhalla-trace-attributes.schema.js';

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

export interface ValhallaAutoCostingOptions {
  use_tolls: number;
  use_highways: number;
  use_ferry: number;
  use_rail_ferry: number;
  use_distance: number;
}

export interface ValhallaMotorcycleCostingOptions {
  use_tolls: number;
  use_highways: number;
  use_ferry: number;
  use_rail_ferry: number;
  use_unpaved: number;
  shortest: boolean;
}

export interface ValhallaMotorScooterCostingOptions {
  use_ferry: number;
  use_rail_ferry: number;
  top_speed: number;
  shortest: boolean;
}

export interface ValhallaCostingOptions {
  auto?: ValhallaAutoCostingOptions;
  motorcycle?: ValhallaMotorcycleCostingOptions;
  motor_scooter?: ValhallaMotorScooterCostingOptions;
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
