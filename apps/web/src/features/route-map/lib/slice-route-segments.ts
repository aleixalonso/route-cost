import type {
  RouteCoordinate,
  RouteMapSegment,
} from '../model/route-map-model';

export interface SlicedRouteSegment {
  readonly coordinates: readonly RouteCoordinate[];
  readonly segmentIndex: number;
  readonly roadCategory: RouteMapSegment['roadCategory'];
}

export function sliceRouteSegments(
  coordinates: readonly RouteCoordinate[],
  segments: readonly RouteMapSegment[] | undefined,
): readonly SlicedRouteSegment[] {
  if (segments === undefined || segments.length === 0) {
    return [];
  }

  return segments.flatMap((segment, segmentIndex) => {
    if (!canSliceSegment(coordinates, segment)) {
      return [];
    }

    const segmentCoordinates = coordinates.slice(
      segment.beginShapeIndex,
      segment.endShapeIndex + 1,
    );

    if (segmentCoordinates.length < 2 || isZeroLength(segmentCoordinates)) {
      return [];
    }

    return [
      {
        coordinates: segmentCoordinates,
        segmentIndex,
        roadCategory: segment.roadCategory,
      },
    ];
  });
}

function canSliceSegment(
  coordinates: readonly RouteCoordinate[],
  segment: RouteMapSegment,
): boolean {
  return (
    segment.beginShapeIndex >= 0 &&
    segment.endShapeIndex >= segment.beginShapeIndex &&
    segment.beginShapeIndex < coordinates.length &&
    segment.endShapeIndex < coordinates.length
  );
}

function isZeroLength(coordinates: readonly RouteCoordinate[]): boolean {
  const first = coordinates[0];

  if (first === undefined) {
    return true;
  }

  return coordinates.every(
    (coordinate) =>
      coordinate.latitude === first.latitude &&
      coordinate.longitude === first.longitude,
  );
}
