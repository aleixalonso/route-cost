import type { RoutingProfile, RoutingRequest } from '../index.js';
import { ValhallaInvalidResponseError } from './valhalla.errors.js';
import type {
  ValhallaConfig,
  ValhallaCostingOptions,
  ValhallaRouteRequest,
  ValhallaTraceAttribute,
  ValhallaTraceAttributesRequest,
} from './valhalla-config.js';

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
] as const satisfies readonly ValhallaTraceAttribute[];

export function buildValhallaRouteRequest(
  request: RoutingRequest,
  profile: RoutingProfile,
  config: Pick<ValhallaConfig, 'maxAlternatives'>,
  costingOptions: ValhallaCostingOptions,
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
    costing_options: costingOptions,
  };
}

export function buildValhallaTraceAttributesRequest(
  encodedPolyline: string,
  profile: RoutingProfile,
  costingOptions: ValhallaCostingOptions,
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
    costing_options: costingOptions,
  };
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
