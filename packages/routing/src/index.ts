import type { VehicleRoutingCategory as ContractVehicleRoutingCategory } from '@route-cost/contracts';

export type VehicleRoutingCategory = ContractVehicleRoutingCategory;

export * from './route-characteristics.js';
export * from './route-compliance.js';
export * from './route-preferences.js';

export type RoutingProfile = 'auto' | 'motorcycle' | 'motor_scooter';

export type RoadCategory = 'urban' | 'interurban' | 'motorway' | 'unknown';

export type SegmentClassificationReason =
  | 'road-class-motorway'
  | 'urban-density'
  | 'urban-road-class'
  | 'interurban-road-class'
  | 'insufficient-data';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

import type { RoutePreferences } from './route-preferences.js';

export interface RoutingRequest {
  origin: Coordinate;
  destination: Coordinate;
  vehicleCategory: VehicleRoutingCategory;
  preferences?: RoutePreferences;
  alternatives?: number;
}

export interface RoutingResult {
  alternatives: RouteAlternative[];
}

export interface RouteAlternative {
  id: string;
  distanceMetres: number;
  durationSeconds: number;
  encodedPolyline: string;
  segments: RouteSegment[];
}

export interface RouteSegment {
  distanceMetres: number;
  beginShapeIndex: number;
  endShapeIndex: number;
  roadCategory: RoadCategory;
  classificationReason: SegmentClassificationReason;
  /**
   * Whether this segment uses a toll road. `null` means the provider data did
   * not include a toll attribute for this segment, so presence is unknown.
   * Absence is never invented from missing data.
   */
  isToll: boolean | null;
  /**
   * Whether this segment is a ferry-like segment (road ferry or rail ferry)
   * that transports the selected road vehicle. `null` means the provider data
   * did not include a usable `use` attribute, so presence is unknown.
   */
  isFerry: boolean | null;
  expectedSpeedKmh?: number;
  speedLimitKmh?: number;
  roadClass?: string;
  roadUse?: string;
  density?: number;
  toll?: boolean;
  unpaved?: boolean;
  surface?: string;
  weightedGrade?: number;
  maximumUpwardGrade?: number;
  maximumDownwardGrade?: number;
  meanElevationMetres?: number;
}

export interface RoutingProvider {
  calculateRoutes(request: RoutingRequest): Promise<RoutingResult>;
}

export interface SegmentClassificationInput {
  roadClass?: string;
  density?: number;
}

export interface SegmentClassification {
  roadCategory: RoadCategory;
  classificationReason: SegmentClassificationReason;
}

export interface RouteDistanceSummary {
  urbanDistanceMetres: number;
  interurbanDistanceMetres: number;
  motorwayDistanceMetres: number;
  unknownDistanceMetres: number;
}

export * from './routing-provider-errors.js';

export function summarizeRouteDistances(
  segments: readonly RouteSegment[],
): RouteDistanceSummary {
  return segments.reduce<RouteDistanceSummary>(
    (summary, segment) => {
      switch (segment.roadCategory) {
        case 'urban':
          summary.urbanDistanceMetres += segment.distanceMetres;
          break;
        case 'interurban':
          summary.interurbanDistanceMetres += segment.distanceMetres;
          break;
        case 'motorway':
          summary.motorwayDistanceMetres += segment.distanceMetres;
          break;
        case 'unknown':
          summary.unknownDistanceMetres += segment.distanceMetres;
          break;
        default: {
          const exhaustive: never = segment.roadCategory;
          return exhaustive;
        }
      }

      return summary;
    },
    {
      urbanDistanceMetres: 0,
      interurbanDistanceMetres: 0,
      motorwayDistanceMetres: 0,
      unknownDistanceMetres: 0,
    },
  );
}

export * from './valhalla/valhalla.errors.js';
export * from './valhalla/valhalla-config.js';
export * from './valhalla/valhalla-costing-options.js';
export type { ValhallaHttpClientConfig } from './valhalla/valhalla-http-client.js';
export { ValhallaHttpClient } from './valhalla/valhalla-http-client.js';
export * from './valhalla/valhalla-normalizer.js';
export * from './valhalla/valhalla-request.builder.js';
export * from './valhalla/valhalla-route.schema.js';
export { calculateValhallaRoutes } from './valhalla/valhalla-route-calculator.js';
export type {
  RoutingProviderLogger,
  ValhallaRoutingProviderConfig,
} from './valhalla/valhalla-routing-provider.js';
export { createValhallaRoutingProvider } from './valhalla/valhalla-routing-provider.js';
export * from './valhalla/valhalla-trace-attributes.schema.js';
