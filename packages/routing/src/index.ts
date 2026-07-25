import type { VehicleRoutingCategory as ContractVehicleRoutingCategory } from '@route-cost/contracts';

export type VehicleRoutingCategory = ContractVehicleRoutingCategory;

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

export interface RoutingRequest {
  origin: Coordinate;
  destination: Coordinate;
  vehicleCategory: VehicleRoutingCategory;
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

export class RoutingProviderAuthenticationError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider authentication failed.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderAuthenticationError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderRateLimitError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider rate limit exceeded.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderRateLimitError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderTimeoutError extends Error {
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider request timed out.',
    options: Pick<
      RoutingProviderErrorOptions,
      'providerRequestId' | 'providerErrorCode'
    > = {},
  ) {
    super(message);
    this.name = 'RoutingProviderTimeoutError';
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderUnavailableError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider is unavailable.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderUnavailableError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderInvalidResponseError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'Routing provider returned an invalid response.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderInvalidResponseError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

export class RoutingProviderRouteNotFoundError extends Error {
  public readonly status: number | undefined;
  public readonly providerRequestId: string | undefined;
  public readonly providerErrorCode: string | undefined;

  public constructor(
    message = 'No route was found.',
    options: RoutingProviderErrorOptions = {},
  ) {
    super(message);
    this.name = 'RoutingProviderRouteNotFoundError';
    this.status = options.status;
    this.providerRequestId = options.providerRequestId;
    this.providerErrorCode = options.providerErrorCode;
  }
}

interface RoutingProviderErrorOptions {
  status?: number | undefined;
  providerRequestId?: string | undefined;
  providerErrorCode?: string | undefined;
}

export function resolveRoutingProfile(
  vehicleCategory: VehicleRoutingCategory,
): RoutingProfile {
  switch (vehicleCategory) {
    case 'car':
      return 'auto';
    case 'motorcycle':
    case 'maxi-scooter':
      return 'motorcycle';
    case 'low-speed-scooter':
      return 'motor_scooter';
    default: {
      const exhaustive: never = vehicleCategory;
      return exhaustive;
    }
  }
}

export function classifyRouteSegment(
  attributes: SegmentClassificationInput,
): SegmentClassification {
  if (attributes.roadClass === 'motorway' || attributes.roadClass === 'trunk') {
    return {
      roadCategory: 'motorway',
      classificationReason: 'road-class-motorway',
    };
  }

  if (attributes.density !== undefined && attributes.density > 8) {
    return {
      roadCategory: 'urban',
      classificationReason: 'urban-density',
    };
  }

  if (
    attributes.roadClass === 'residential' ||
    attributes.roadClass === 'service_other'
  ) {
    return {
      roadCategory: 'urban',
      classificationReason: 'urban-road-class',
    };
  }

  if (
    attributes.roadClass === 'primary' ||
    attributes.roadClass === 'secondary' ||
    attributes.roadClass === 'tertiary' ||
    attributes.roadClass === 'unclassified'
  ) {
    return {
      roadCategory: 'interurban',
      classificationReason: 'interurban-road-class',
    };
  }

  return {
    roadCategory: 'unknown',
    classificationReason: 'insufficient-data',
  };
}

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
