import { Injectable } from '@nestjs/common';
import {
  normalizeRoutePreferences,
  type RouteAlternative,
  type RoutePreferences,
  type RouteSegment,
  type RoutingProvider,
  type RoutingRequest,
  type RoutingResult,
} from '@route-cost/routing';

@Injectable()
export class MockRoutingProvider implements RoutingProvider {
  public calculateRoutes(request: RoutingRequest): Promise<RoutingResult> {
    const preferences = normalizeRoutePreferences(request.preferences);

    return Promise.resolve({
      alternatives: [
        buildPrimaryRoute(preferences),
        ...buildRequestedAlternatives(request.alternatives ?? 0, preferences),
      ],
    });
  }
}

const PRIMARY_ENCODED_POLYLINE =
  'o~`}mA_hmcCqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eH';
const ALTERNATIVE_POLYLINES = [
  'o~`}mA_hmcCyYiUwYiUyYiUwYkUyYiUwYiUyYiUyYiUwYiUyYiUwYkUyYiUwYiUyYiUyYiUwYiUyYiUwYkUyYiUwYiUyYiUyYiUwYiUyYiUwYkUyYiUwYiUyYiU',
  'o~`}mA_hmcCeg@hUeg@hUeg@hUcg@jUeg@hUeg@hUeg@hUeg@hUeg@hUeg@hUcg@jUeg@hUeg@hUeg@hUeg@hUeg@hUeg@hUcg@jUeg@hUeg@hUeg@hUeg@hUeg@hUeg@hUcg@jUeg@hUeg@hU',
] as const;

/**
 * Deterministic preference-aware scenarios:
 *
 * - Default fastest route: contains a motorway and a toll segment, no ferry.
 * - Avoid tolls: the primary route still contains the toll segment on its
 *   motorway (unavoidable toll), so compliance reports a conflict; the
 *   requested alternative is the toll-free longer route.
 * - Avoid motorways: the primary route drops the motorway segment entirely
 *   and stays on interurban roads (compliant).
 * - Avoid ferries: the primary route includes an unavoidable ferry segment
 *   (conflict).
 */
function buildPrimaryRoute(preferences: RoutePreferences): RouteAlternative {
  const segments: RouteSegment[] = [
    {
      distanceMetres: 7_500,
      beginShapeIndex: 0,
      endShapeIndex: 12,
      roadCategory: 'urban',
      classificationReason: 'urban-density',
      roadClass: 'primary',
      density: 9,
      isToll: false,
      isFerry: false,
    },
    {
      distanceMetres: 5_000,
      beginShapeIndex: 13,
      endShapeIndex: 20,
      roadCategory: 'interurban',
      classificationReason: 'interurban-road-class',
      roadClass: 'secondary',
      isToll: false,
      isFerry: false,
    },
  ];

  if (preferences.avoidMotorways) {
    segments.push({
      distanceMetres: 5_000,
      beginShapeIndex: 21,
      endShapeIndex: 30,
      roadCategory: 'interurban',
      classificationReason: 'interurban-road-class',
      roadClass: 'secondary',
      isToll: false,
      isFerry: false,
    });
  } else {
    segments.push({
      distanceMetres: 5_000,
      beginShapeIndex: 21,
      endShapeIndex: 30,
      roadCategory: 'motorway',
      classificationReason: 'road-class-motorway',
      roadClass: 'motorway',
      isToll: true,
      isFerry: false,
    });
  }

  let durationSeconds = 1620;

  if (preferences.avoidMotorways) {
    durationSeconds += 120;
  }

  if (preferences.avoidFerries) {
    segments.push({
      distanceMetres: 2_000,
      beginShapeIndex: 31,
      endShapeIndex: 38,
      roadCategory: 'interurban',
      classificationReason: 'insufficient-data',
      roadClass: 'unclassified',
      roadUse: 'ferry',
      isToll: false,
      isFerry: true,
    });
    durationSeconds += 300;
  }

  return {
    id: 'primary',
    distanceMetres: sumDistances(segments),
    durationSeconds,
    encodedPolyline: PRIMARY_ENCODED_POLYLINE,
    segments,
  };
}

function buildRequestedAlternatives(
  count: number,
  preferences: RoutePreferences,
): RouteAlternative[] {
  return Array.from({ length: count }, (_value, index) => {
    if (index === 0) {
      return buildTollFreeAlternative(preferences);
    }

    return buildFerryAlternative(index);
  });
}

/**
 * Toll-avoiding alternative: no tolls, contains a motorway, longer duration
 * than the primary route.
 */
function buildTollFreeAlternative(
  preferences: RoutePreferences,
): RouteAlternative {
  const segments: RouteSegment[] = [
    {
      distanceMetres: 4_000,
      beginShapeIndex: 0,
      endShapeIndex: 8,
      roadCategory: 'urban',
      classificationReason: 'urban-density',
      roadClass: 'primary',
      density: 10,
      isToll: false,
      isFerry: false,
    },
    {
      distanceMetres: 6_000,
      beginShapeIndex: 9,
      endShapeIndex: 18,
      roadCategory: 'interurban',
      classificationReason: 'interurban-road-class',
      roadClass: 'primary',
      isToll: false,
      isFerry: false,
    },
  ];

  if (preferences.avoidMotorways) {
    segments.push({
      distanceMetres: 4_000,
      beginShapeIndex: 19,
      endShapeIndex: 28,
      roadCategory: 'interurban',
      classificationReason: 'interurban-road-class',
      roadClass: 'tertiary',
      isToll: false,
      isFerry: false,
    });
  } else {
    segments.push({
      distanceMetres: 4_000,
      beginShapeIndex: 19,
      endShapeIndex: 28,
      roadCategory: 'motorway',
      classificationReason: 'road-class-motorway',
      roadClass: 'motorway',
      isToll: false,
      isFerry: false,
    });
  }

  return {
    id: 'alternative-1',
    distanceMetres: sumDistances(segments),
    durationSeconds: 1740,
    encodedPolyline: ALTERNATIVE_POLYLINES[0] ?? PRIMARY_ENCODED_POLYLINE,
    segments,
  };
}

/** Ferry scenario: a shorter alternative that requires a ferry. */
function buildFerryAlternative(index: number): RouteAlternative {
  return {
    id: `alternative-${index + 1}`,
    distanceMetres: 12_500 + index * 500,
    durationSeconds: 1950 + index * 120,
    encodedPolyline:
      ALTERNATIVE_POLYLINES[index % ALTERNATIVE_POLYLINES.length] ??
      PRIMARY_ENCODED_POLYLINE,
    segments: [
      {
        distanceMetres: 4_000,
        beginShapeIndex: 0,
        endShapeIndex: 8,
        roadCategory: 'urban',
        classificationReason: 'urban-density',
        roadClass: 'primary',
        density: 10,
        isToll: false,
        isFerry: false,
      },
      {
        distanceMetres: 2_500,
        beginShapeIndex: 9,
        endShapeIndex: 16,
        roadCategory: 'interurban',
        classificationReason: 'insufficient-data',
        roadClass: 'unclassified',
        roadUse: 'ferry',
        isToll: false,
        isFerry: true,
      },
      {
        distanceMetres: 6_000,
        beginShapeIndex: 17,
        endShapeIndex: 26,
        roadCategory: 'interurban',
        classificationReason: 'interurban-road-class',
        roadClass: 'secondary',
        isToll: false,
        isFerry: false,
      },
    ],
  };
}

function sumDistances(segments: readonly RouteSegment[]): number {
  return segments.reduce((total, segment) => total + segment.distanceMetres, 0);
}
