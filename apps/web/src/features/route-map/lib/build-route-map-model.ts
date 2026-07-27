import type { SelectedLocation } from '../../location-search';
import type {
  RouteCostAlternative,
  RouteMapModel,
} from '../model/route-map-model';
import { buildRouteLineFeature } from './build-route-geojson';
import { buildRouteSegmentFeatures } from './build-segment-geojson';
import { calculateRouteBounds } from './calculate-route-bounds';
import { decodeRouteGeometry } from './decode-route-geometry';

export function buildRouteMapModel(
  alternative: RouteCostAlternative,
  origin: SelectedLocation,
  destination: SelectedLocation,
): RouteMapModel {
  const coordinates = decodeRouteGeometry(alternative.encodedPolyline);

  if (coordinates.length === 0) {
    throw new Error('Route geometry has no coordinates.');
  }

  const segments = buildRouteSegmentFeatures(coordinates, alternative.segments);

  return {
    alternativeId: alternative.id,
    fullRoute: buildRouteLineFeature(coordinates),
    segments,
    bounds: calculateRouteBounds(coordinates),
    coordinates,
    origin: origin.coordinate,
    destination: destination.coordinate,
    representedCategories: new Set(
      alternative.segments.map((segment) => segment.roadCategory),
    ),
  };
}
