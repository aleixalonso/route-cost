import type {
  RouteCoordinate,
  RouteSegmentProperties,
} from '../model/route-map-model';
import type { RouteMapSegment } from '../model/route-map-model';
import { buildRouteLineFeature } from './build-route-geojson';
import type { LineStringFeatureCollection } from './geojson';
import { sliceRouteSegments } from './slice-route-segments';

export function buildRouteSegmentFeatures(
  coordinates: readonly RouteCoordinate[],
  segments: readonly RouteMapSegment[] | undefined,
): LineStringFeatureCollection<RouteSegmentProperties> {
  return {
    type: 'FeatureCollection',
    features: sliceRouteSegments(coordinates, segments).map((segment) => ({
      ...buildRouteLineFeature(segment.coordinates),
      properties: {
        roadCategory: segment.roadCategory,
        segmentIndex: segment.segmentIndex,
      },
    })),
  };
}
