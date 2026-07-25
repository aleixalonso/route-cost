import type { Coordinates } from '@route-cost/contracts';

export type RoadCategory =
  'motorway' | 'primary' | 'secondary' | 'urban' | 'unknown';

export interface RoutingRequest {
  origin: Coordinates;
  destination: Coordinates;
}

export interface RouteSegment {
  distanceKm: number;
  durationSeconds: number;
  roadCategory: RoadCategory;
}

export interface RouteAlternative {
  id: string;
  distanceKm: number;
  durationSeconds: number;
  segments: RouteSegment[];
}

export interface RoutingResult {
  alternatives: RouteAlternative[];
}

export interface RoutingProvider {
  calculateRoutes(request: RoutingRequest): Promise<RoutingResult>;
}
