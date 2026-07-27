import { Injectable } from '@nestjs/common';
import type {
  RouteAlternative,
  RoutingProvider,
  RoutingRequest,
  RoutingResult,
} from '@route-cost/routing';

@Injectable()
export class MockRoutingProvider implements RoutingProvider {
  public calculateRoutes(request: RoutingRequest): Promise<RoutingResult> {
    const alternatives = [
      buildPrimaryRoute(request),
      ...buildRequestedAlternatives(request.alternatives ?? 0),
    ];

    return Promise.resolve({
      alternatives,
    });
  }
}

const PRIMARY_ENCODED_POLYLINE =
  'o~`}mA_hmcCqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eHqa@eHsa@cHqa@eH';
const ALTERNATIVE_POLYLINES = [
  'o~`}mA_hmcCyYiUwYiUyYiUwYkUyYiUwYiUyYiUyYiUwYiUyYiUwYkUyYiUwYiUyYiUyYiUwYiUyYiUwYkUyYiUwYiUyYiUyYiUwYiUyYiUwYkUyYiUwYiUyYiU',
  'o~`}mA_hmcCeg@hUeg@hUeg@hUcg@jUeg@hUeg@hUeg@hUeg@hUeg@hUeg@hUcg@jUeg@hUeg@hUeg@hUeg@hUeg@hUeg@hUcg@jUeg@hUeg@hUeg@hUeg@hUeg@hUeg@hUcg@jUeg@hUeg@hU',
] as const;

function buildPrimaryRoute(request: RoutingRequest): RouteAlternative {
  return {
    id: 'primary',
    distanceMetres: 17_500,
    durationSeconds: 1620,
    encodedPolyline: PRIMARY_ENCODED_POLYLINE,
    segments: [
      {
        distanceMetres: 7_500,
        beginShapeIndex: 0,
        endShapeIndex: 12,
        roadCategory: 'urban',
        classificationReason: 'urban-density',
        roadClass: 'primary',
        density: 9,
      },
      {
        distanceMetres: 5_000,
        beginShapeIndex: 13,
        endShapeIndex: 20,
        roadCategory: 'interurban',
        classificationReason: 'interurban-road-class',
        roadClass: 'secondary',
      },
      {
        distanceMetres: 5_000,
        beginShapeIndex: 21,
        endShapeIndex: 30,
        roadCategory:
          request.vehicleCategory === 'low-speed-scooter'
            ? 'interurban'
            : 'motorway',
        classificationReason:
          request.vehicleCategory === 'low-speed-scooter'
            ? 'interurban-road-class'
            : 'road-class-motorway',
        roadClass:
          request.vehicleCategory === 'low-speed-scooter'
            ? 'secondary'
            : 'motorway',
      },
    ],
  };
}

function buildRequestedAlternatives(count: number): RouteAlternative[] {
  return Array.from({ length: count }, (_value, index) => ({
    id: `alternative-${index + 1}`,
    distanceMetres: 14_000 + index * 1_000,
    durationSeconds: 1500 + index * 120,
    encodedPolyline:
      ALTERNATIVE_POLYLINES[index % ALTERNATIVE_POLYLINES.length] ??
      PRIMARY_ENCODED_POLYLINE,
    segments: [
      {
        distanceMetres: 4_000 + index * 500,
        beginShapeIndex: 0,
        endShapeIndex: 8,
        roadCategory: 'urban',
        classificationReason: 'urban-density',
        roadClass: 'primary',
        density: 10,
      },
      {
        distanceMetres: 6_000,
        beginShapeIndex: 9,
        endShapeIndex: 18,
        roadCategory: 'interurban',
        classificationReason: 'interurban-road-class',
        roadClass: 'primary',
      },
      {
        distanceMetres: 4_000 + index * 500,
        beginShapeIndex: 19,
        endShapeIndex: 28,
        roadCategory: 'motorway',
        classificationReason: 'road-class-motorway',
        roadClass: 'motorway',
      },
    ],
  }));
}
