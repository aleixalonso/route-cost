import {
  classifyRouteSegment,
  type RouteAlternative,
  type RouteSegment,
  type RoutingResult,
} from '@route-cost/routing';

import { ValhallaInvalidResponseError } from './valhalla.errors';
import type {
  ValhallaRouteResponse,
  ValhallaTraceAttributesResponse,
} from './valhalla.types';

const KILOMETRES_TO_METRES = 1_000;
const ROUTE_SEGMENT_DISTANCE_TOLERANCE_METRES = 250;
const ROUTE_SEGMENT_DISTANCE_TOLERANCE_RATIO = 0.05;

export function normalizeValhallaRoutes(
  routeResponse: ValhallaRouteResponse,
  traceResponses: readonly ValhallaTraceAttributesResponse[],
): RoutingResult {
  const trips = getOrderedTrips(routeResponse);

  if (trips.length !== traceResponses.length) {
    throw invalidResponse('trace_response_count_mismatch');
  }

  return {
    alternatives: trips.map((trip, index) =>
      normalizeAlternative(
        trip,
        getTraceResponse(traceResponses, index),
        index,
      ),
    ),
  };
}

export function getValhallaRouteShapes(
  routeResponse: ValhallaRouteResponse,
): string[] {
  return getOrderedTrips(routeResponse).map((trip) => {
    const shape = trip.legs[0]?.shape;

    if (!shape) {
      throw invalidResponse('missing_route_shape');
    }

    return shape;
  });
}

function normalizeAlternative(
  trip: ValhallaRouteResponse['trip'],
  traceResponse: ValhallaTraceAttributesResponse,
  index: number,
): RouteAlternative {
  const distanceMetres = kilometresToMetres(trip.summary.length);
  const durationSeconds = validatedNonNegativeFinite(
    trip.summary.time,
    'invalid_route_duration',
  );
  const encodedPolyline = trip.legs[0]?.shape;

  if (!encodedPolyline) {
    throw invalidResponse('missing_route_shape');
  }

  const segments = traceResponse.edges.map(normalizeSegment);
  validateDistanceTolerance(distanceMetres, segments);

  return {
    id: index === 0 ? 'primary' : `alternative-${index}`,
    distanceMetres,
    durationSeconds,
    encodedPolyline,
    segments,
  };
}

function normalizeSegment(
  edge: ValhallaTraceAttributesResponse['edges'][number],
): RouteSegment {
  const distanceMetres = kilometresToMetres(edge.length);
  const beginShapeIndex = edge.begin_shape_index;
  const endShapeIndex = edge.end_shape_index;

  if (beginShapeIndex < 0 || endShapeIndex < beginShapeIndex) {
    throw invalidResponse('invalid_shape_index_range');
  }

  const roadClass = nullToUndefined(edge.road_class);
  const density = validateOptionalFinite(edge.density, 'invalid_density');
  const classification = classifyRouteSegment({
    ...(roadClass === undefined ? {} : { roadClass }),
    ...(density === undefined ? {} : { density }),
  });
  const expectedSpeedKmh = validateOptionalNonNegative(
    edge.speed,
    'invalid_speed',
  );
  const speedLimitKmh = validateOptionalNonNegative(
    edge.speed_limit,
    'invalid_speed_limit',
  );
  const roadUse = nullToUndefined(edge.use);
  const toll = nullToUndefined(edge.toll);
  const unpaved = nullToUndefined(edge.unpaved);
  const surface = nullToUndefined(edge.surface);
  const weightedGrade = validateOptionalFinite(
    edge.weighted_grade,
    'invalid_weighted_grade',
  );
  const maximumUpwardGrade = validateOptionalFinite(
    edge.max_upward_grade,
    'invalid_max_upward_grade',
  );
  const maximumDownwardGrade = validateOptionalFinite(
    edge.max_downward_grade,
    'invalid_max_downward_grade',
  );
  const meanElevationMetres = validateOptionalFinite(
    edge.mean_elevation,
    'invalid_mean_elevation',
  );

  return {
    distanceMetres,
    beginShapeIndex,
    endShapeIndex,
    ...classification,
    ...(expectedSpeedKmh === undefined ? {} : { expectedSpeedKmh }),
    ...(speedLimitKmh === undefined ? {} : { speedLimitKmh }),
    ...(roadClass === undefined ? {} : { roadClass }),
    ...(roadUse === undefined ? {} : { roadUse }),
    ...(density === undefined ? {} : { density }),
    ...(toll === undefined ? {} : { toll }),
    ...(unpaved === undefined ? {} : { unpaved }),
    ...(surface === undefined ? {} : { surface }),
    ...(weightedGrade === undefined ? {} : { weightedGrade }),
    ...(maximumUpwardGrade === undefined ? {} : { maximumUpwardGrade }),
    ...(maximumDownwardGrade === undefined ? {} : { maximumDownwardGrade }),
    ...(meanElevationMetres === undefined ? {} : { meanElevationMetres }),
  };
}

function getOrderedTrips(
  routeResponse: ValhallaRouteResponse,
): ValhallaRouteResponse['trip'][] {
  return [
    routeResponse.trip,
    ...(routeResponse.alternates ?? []).map((alternate) => alternate.trip),
  ];
}

function kilometresToMetres(value: number): number {
  return (
    validatedNonNegativeFinite(value, 'invalid_distance') * KILOMETRES_TO_METRES
  );
}

function validatedNonNegativeFinite(value: number, code: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw invalidResponse(code);
  }

  return value;
}

function validateOptionalNonNegative(
  value: number | null | undefined,
  code: string,
): number | undefined {
  const normalized = nullToUndefined(value);

  if (normalized === undefined) {
    return undefined;
  }

  return validatedNonNegativeFinite(normalized, code);
}

function validateOptionalFinite(
  value: number | null | undefined,
  code: string,
): number | undefined {
  const normalized = nullToUndefined(value);

  if (normalized === undefined) {
    return undefined;
  }

  if (!Number.isFinite(normalized)) {
    throw invalidResponse(code);
  }

  return normalized;
}

function validateDistanceTolerance(
  routeDistanceMetres: number,
  segments: readonly RouteSegment[],
): void {
  const segmentDistanceMetres = segments.reduce(
    (total, segment) => total + segment.distanceMetres,
    0,
  );
  const toleranceMetres = Math.max(
    ROUTE_SEGMENT_DISTANCE_TOLERANCE_METRES,
    routeDistanceMetres * ROUTE_SEGMENT_DISTANCE_TOLERANCE_RATIO,
  );

  if (Math.abs(routeDistanceMetres - segmentDistanceMetres) > toleranceMetres) {
    throw invalidResponse('route_segment_distance_mismatch');
  }
}

function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

function getTraceResponse(
  traceResponses: readonly ValhallaTraceAttributesResponse[],
  index: number,
): ValhallaTraceAttributesResponse {
  const traceResponse = traceResponses[index];

  if (traceResponse === undefined) {
    throw invalidResponse('trace_response_count_mismatch');
  }

  return traceResponse;
}

function invalidResponse(
  providerErrorCode: string,
): ValhallaInvalidResponseError {
  return new ValhallaInvalidResponseError({ providerErrorCode });
}
