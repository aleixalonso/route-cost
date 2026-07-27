import type { RouteCoordinate } from '../model/route-map-model';
import type { LineStringFeature } from './geojson';
import { assertValidRouteCoordinate } from './validate-coordinate';

export function buildRouteLineFeature(
  coordinates: readonly RouteCoordinate[],
): LineStringFeature {
  if (coordinates.length === 0) {
    throw new Error('Route line requires at least one coordinate.');
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates.map((coordinate) => {
        assertValidRouteCoordinate(coordinate);
        return [coordinate.longitude, coordinate.latitude] as const;
      }),
    },
    properties: {},
  };
}
