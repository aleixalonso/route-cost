import type { RouteBounds, RouteCoordinate } from '../model/route-map-model';
import { assertValidRouteCoordinate } from './validate-coordinate';

export function calculateRouteBounds(
  coordinates: readonly RouteCoordinate[],
): RouteBounds {
  if (coordinates.length === 0) {
    throw new Error('Route bounds require at least one coordinate.');
  }

  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const coordinate of coordinates) {
    assertValidRouteCoordinate(coordinate);
    west = Math.min(west, coordinate.longitude);
    south = Math.min(south, coordinate.latitude);
    east = Math.max(east, coordinate.longitude);
    north = Math.max(north, coordinate.latitude);
  }

  const bounds = { west, south, east, north };

  if (!Object.values(bounds).every(Number.isFinite)) {
    throw new Error('Route bounds are invalid.');
  }

  return bounds;
}
