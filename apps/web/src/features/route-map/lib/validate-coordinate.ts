import type { RouteCoordinate } from '../model/route-map-model';

export function isValidRouteCoordinate(coordinate: RouteCoordinate): boolean {
  return (
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
}

export function assertValidRouteCoordinate(coordinate: RouteCoordinate): void {
  if (!isValidRouteCoordinate(coordinate)) {
    throw new Error('Invalid route coordinate.');
  }
}
