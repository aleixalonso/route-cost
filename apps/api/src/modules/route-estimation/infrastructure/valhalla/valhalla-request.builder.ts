import type { RoutingProfile, RoutingRequest } from '@route-cost/routing';

import { ValhallaInvalidResponseError } from './valhalla.errors';
import type {
  ValhallaConfig,
  ValhallaRouteRequest,
  ValhallaTraceAttributesRequest,
} from './valhalla.types';

export const traceAttributeFilter = [
  'edge.length',
  'edge.speed',
  'edge.speed_limit',
  'edge.road_class',
  'edge.use',
  'edge.toll',
  'edge.unpaved',
  'edge.surface',
  'edge.density',
  'edge.weighted_grade',
  'edge.max_upward_grade',
  'edge.max_downward_grade',
  'edge.mean_elevation',
  'edge.begin_shape_index',
  'edge.end_shape_index',
] as const;

export function buildValhallaRouteRequest(
  request: RoutingRequest,
  profile: RoutingProfile,
  config: Pick<ValhallaConfig, 'maxAlternatives'>,
): ValhallaRouteRequest {
  assertValidCoordinates(request);
  const alternatives = Math.min(
    request.alternatives ?? 0,
    config.maxAlternatives,
  );

  return {
    locations: [
      { lat: request.origin.latitude, lon: request.origin.longitude },
      { lat: request.destination.latitude, lon: request.destination.longitude },
    ] as const,
    costing: profile,
    units: 'kilometers',
    directions_type: 'none',
    ...(alternatives > 0 ? { alternates: alternatives } : {}),
    ...withCostingOptions(profile),
  };
}

export function buildValhallaTraceAttributesRequest(
  encodedPolyline: string,
  profile: RoutingProfile,
): ValhallaTraceAttributesRequest {
  if (encodedPolyline.trim().length === 0) {
    throw new ValhallaInvalidResponseError({
      providerErrorCode: 'missing_route_shape',
    });
  }

  return {
    encoded_polyline: encodedPolyline,
    costing: profile,
    shape_match: 'edge_walk',
    filters: {
      action: 'include',
      attributes: traceAttributeFilter,
    },
    ...withCostingOptions(profile),
  };
}

function buildCostingOptions(
  profile: RoutingProfile,
): ValhallaRouteRequest['costing_options'] {
  switch (profile) {
    case 'auto':
      return undefined;
    case 'motorcycle':
      return {
        motorcycle: {
          use_unpaved: 0,
        },
      };
    case 'motor_scooter':
      return {
        motor_scooter: {
          top_speed: 45,
          use_highways: 0,
        },
      };
    default: {
      const exhaustive: never = profile;
      return exhaustive;
    }
  }
}

function assertValidCoordinates(request: RoutingRequest): void {
  for (const coordinate of [request.origin, request.destination]) {
    if (
      !Number.isFinite(coordinate.latitude) ||
      coordinate.latitude < -90 ||
      coordinate.latitude > 90 ||
      !Number.isFinite(coordinate.longitude) ||
      coordinate.longitude < -180 ||
      coordinate.longitude > 180
    ) {
      throw new ValhallaInvalidResponseError({
        providerErrorCode: 'invalid_coordinates',
      });
    }
  }
}

function withCostingOptions(
  profile: RoutingProfile,
): Pick<ValhallaRouteRequest, 'costing_options'> | Record<string, never> {
  const costingOptions = buildCostingOptions(profile);
  return costingOptions === undefined
    ? {}
    : { costing_options: costingOptions };
}
